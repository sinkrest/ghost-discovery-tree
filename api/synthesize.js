export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tree } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  function flattenTree(nodes, result) {
    if (!nodes) return result;
    var arr = Array.isArray(nodes) ? nodes : [nodes];
    for (var i = 0; i < arr.length; i++) {
      var n = arr[i];
      result.push({
        type: n.type,
        title: n.title,
        description: n.description,
        source: n.source || null,
        scores: n.scores || null,
        status: n.status || null,
        assumptions: n.assumptions || null
      });
      if (n.children) flattenTree(n.children, result);
    }
    return result;
  }

  var allNodes = flattenTree(tree, []);

  var outcomes = allNodes.filter(function(n) { return n.type === 'outcome'; });
  var opportunities = allNodes.filter(function(n) { return n.type === 'opportunity'; });
  var solutions = allNodes.filter(function(n) { return n.type === 'solution'; });
  var experiments = allNodes.filter(function(n) { return n.type === 'experiment'; });

  var oppSummary = opportunities.map(function(o) {
    var scores = o.scores || {};
    return '- "' + o.title + '" — Customer Value: ' + (scores.customerValue || '?') +
      ', Business Impact: ' + (scores.businessImpact || '?') +
      ', Effort: ' + (scores.effort || '?') +
      (o.source ? ' | Source: ' + o.source : '');
  }).join('\n');

  var expSummary = experiments.map(function(e) {
    var assumptions = (e.assumptions || []).join('; ');
    return '- "' + e.title + '" [' + (e.status || 'untested') + ']' +
      (assumptions ? ' — Assumptions: ' + assumptions : '');
  }).join('\n');

  var systemPrompt = 'You are a senior product manager analyzing an Opportunity Solution Tree for Ghost (the publishing platform).\n\n' +
    'Given the current tree state, generate a concise Discovery Brief with these sections:\n\n' +
    '## Top Priority Opportunity\n' +
    'Which opportunity has the highest combined score and why it should be tackled first.\n\n' +
    '## Untested Assumptions\n' +
    'List all assumptions marked "untested" across the tree. Highlight which ones are riskiest (would invalidate the solution if wrong).\n\n' +
    '## Competitive Context\n' +
    'Based on signals from competitors (Kit, Beehiiv, Substack), which opportunities are becoming urgent?\n\n' +
    '## Recommended Next Experiments\n' +
    '2-3 specific experiments to run this week, ordered by learning value.\n\n' +
    '## Tree Health\n' +
    'Are there opportunities without solutions? Solutions without experiments? Flag structural gaps.\n\n' +
    'Be specific to Ghost\'s context. Reference actual data points (vote counts, competitor features, community sentiment). Keep it actionable — a PM should read this Monday morning and know exactly what to do.';

  var userPrompt = 'Here is the current Opportunity Solution Tree state:\n\n' +
    '**Outcomes (' + outcomes.length + '):**\n' +
    outcomes.map(function(o) { return '- ' + o.title + ': ' + o.description; }).join('\n') + '\n\n' +
    '**Opportunities (' + opportunities.length + ') with scores:**\n' +
    oppSummary + '\n\n' +
    '**Solutions (' + solutions.length + '):**\n' +
    solutions.map(function(s) { return '- ' + s.title + ': ' + s.description; }).join('\n') + '\n\n' +
    '**Experiments (' + experiments.length + ') with assumptions:**\n' +
    expSummary + '\n\n' +
    'Generate the Discovery Brief now.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    var result = await response.json();

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    var brief = (result.content && result.content[0] && result.content[0].text) || 'Analysis unavailable.';
    res.json({ brief: brief, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
