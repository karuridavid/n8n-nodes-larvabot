# n8n-nodes-larvabot

n8n community nodes for [Larvabot](https://larvabot.com), which finds people asking for what you sell (on Reddit, Threads, X, Facebook groups, forums and more) and businesses worth a personal email, with a draft for each.

Use them to send Larvabot's leads, replies and conversations to your CRM, a spreadsheet, Slack, or an AI agent. The sync is one way: n8n reads from Larvabot; nothing in Larvabot is changed.

[Installation](#installation) · [Credentials](#credentials) · [Nodes](#nodes) · [Example workflows](#example-workflows) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n docs. In n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-larvabot`.

## Credentials

You need a Larvabot account (14-day free trial, no card required) and an API key:

1. In Larvabot, open **Settings → Integrations → API keys** and click **Create API key**. Copy it; it's shown once and starts with `lb_`.
2. In n8n, create a **Larvabot API** credential and paste the key.

n8n tests the key against `GET https://app.larvabot.com/api/v1/me`. Keys can be revoked any time in Larvabot. Each key only reads the projects of the account that created it.

## Nodes

### Larvabot Trigger

Polls Larvabot and starts the workflow once per new item.

| Trigger on | Fires when |
| --- | --- |
| New Lead | A business worth contacting is scored as a fit |
| Lead Contacted | The first email to a lead is sent |
| Lead Replied | A lead replies to your email |
| New Conversation | Someone posts asking for what you sell (relevance 50 or more) |

Pick a **Project**, or leave it on *All Projects*. When the workflow is first activated, the trigger records where to start, so existing items don't flood it; **Fetch Test Event** returns the newest item for mapping.

### Larvabot

Reads data on demand, in any workflow or as a tool for an AI agent.

| Resource | Operation | Notes |
| --- | --- | --- |
| Lead | Get Many | Filter by status (found, contacted, replied) and project |
| Conversation | Get Many | Relevant posts, newest first |
| Project | Get Many | Your projects |
| Account | Get | The account the key belongs to |

Leads and conversations come newest first. Set **Limit** for the newest few, or turn on **Return All** to page back through every one. The project filter is under **Filters**.

Each lead includes `name`, `email`, `company`, `website`, `page_url`, `fit_score`, `fit_reason`, `stage`, `project`, `campaign`, `found_at`, `contacted_at`, `replied_at` and `dashboard_url`. Each conversation includes `platform`, `author`, `title`, `url`, `excerpt`, `relevance`, `intent`, `why`, `suggested_reply`, `posted_at` and `dashboard_url`. Full field list: [API reference](https://larvabot.com/docs/reference/api).

## Example workflows

- **New leads to Google Sheets:** Larvabot Trigger (New Lead) → Google Sheets (Append Row).
- **Hot conversations to Slack:** Larvabot Trigger (New Conversation) → If (`relevance` ≥ 85) → Slack (Send Message) with the title, link and `suggested_reply`.
- **Replies into HubSpot:** Larvabot Trigger (Lead Replied) → HubSpot (Create or Update Contact) → HubSpot (Update Deal stage).
- **Weekly digest:** Schedule Trigger (Mondays) → Larvabot (Lead: Get Many, status Replied) → Aggregate → Gmail (Send).
- **Ask an AI agent about your pipeline:** AI Agent with the Larvabot node as a tool: “Which leads replied this week, and what do they sell?”

## Compatibility

Requires n8n 1.0 or later. Built with `@n8n/node-cli`, with no runtime dependencies.

## Resources

- [Larvabot + n8n](https://larvabot.com/integrations/n8n)
- [Larvabot API reference](https://larvabot.com/docs/reference/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
