# AGS Core guide

## What customers can do

| Page | Shortcode | Use |
| --- | --- | --- |
| Request a Service | `[ags_request_form]` | Send a request. Works without login. `?service=electrician&mandal=palasa` preselects choices. |
| Track Your Request | `[ags_track_request]` | Reference number + phone shows the status timeline. |
| My Requests | `[ags_customer_dashboard]` | Logged-in customers see all requests and rate completed jobs. |
| Srikakulam Directory | `[ags_directory]` | Search listings and providers by keyword, service and mandal. |
| Any page | `[ags_service_grid]` | All service categories as a grid (good for the homepage). |

## What providers can do

| Page | Shortcode | Use |
| --- | --- | --- |
| Join as a Provider | `[ags_provider_signup]` | Apply. Creates a login (set-password email) and a pending provider profile. |
| Provider Dashboard | `[ags_provider_dashboard]` | Accept or decline jobs, mark on the way, started, completed. Customer phone and address appear only after accepting. |

## What the team does (WordPress admin → AGS)

- **Dashboard:** new requests, open jobs, completed jobs, commission, providers to verify, live listings, new leads.
- **Requests board:** filter by status; assign a provider, change status, enter the job amount (commission is calculated from AGS → Settings).
- **Providers:** open a pending provider, verify ID and phone, set Verified = Yes, fill "Verified by", Publish.
- **Listings:** directory entries with the standard fields. Only verified data.
- **Leads CRM:** leads from the tech site and forms; status and next follow-up date. Overdue rows are highlighted.

## Request statuses

New → Assigned → Accepted by provider → On the way → Work in progress → Completed (or Cancelled).
If a provider declines, the request goes back to New for reassignment. Every change is logged in the timeline.

## Alerts

- Team: email (and Telegram if set) for new requests, provider applications, new leads, completed/cancelled jobs and declines.
- Provider: email when a job is assigned.
- Customer (logged in): email when assigned, on the way, completed or cancelled.

## Protection built in

Form tokens, a hidden spam trap, max 5 form posts per visitor per 10 minutes, permission checks on every action, customer consent checkbox.

## REST API

- `GET /wp-json/ags/v1/listings?service=<slug>&mandal=<slug>&search=<text>&per_page=20&page=1`
- `POST /wp-json/ags/v1/leads` with header `X-AGS-Key: <Lead API key>` and fields `name, phone, email, business, need, source`.
