# 5-Tier RBAC Setup (EspoCRM)

EspoCRM's permission system has two layers, and understanding both is the
key to mapping our 5 required tiers onto it correctly:

1. **User Type** — a user is flagged `Is Admin` (bypasses all ACL, full
   system access) or is a `Regular` user governed by Roles.
2. **Roles** (Administration → Roles) — assigned to Regular users. Each
   Role is a matrix of *entity* (Lead, Contact, Account, Opportunity,
   Task, Call, Meeting, Document, Report, ...) × *action*
   (Read / Edit / Delete / Stream / Export / Mass Update) × *scope level*
   (`Not Set` < `No` < `Own` < `Team` < `All`). `Own` = only records the
   user owns; `Team` = records owned by anyone on the user's Team(s);
   `All` = every record regardless of owner.

Since EspoCRM only has one true "bypass everything" flag (`Is Admin`), we
map the 5 requested tiers onto it like this:

| Tier | EspoCRM mechanism | What it grants |
|---|---|---|
| **1. Super Admin** | User Type = `Is Admin` (the native flag) | Full system access: Admin Panel, user management, integrations, all data, no restrictions. Reserve this for 1-2 people only. |
| **2. Admin** | Regular user + custom Role **"Admin"** | `All` scope, Read/Edit/Delete/Export on every CRM entity. In the Role's **Administration** section, additionally enable the specific admin panels they need (e.g. User Management, Role Management) *without* giving them the `Is Admin` flag — so they can administer the CRM day-to-day without full system/integration access. |
| **3. Manager** | Regular user + custom Role **"Manager"** | `Team` scope on Read/Edit for Lead, Contact, Account, Opportunity, Task, Call, Meeting (sees/manages everything their team owns). `All`-scope **Read** on Reports/Dashboards for oversight. `Own`-scope Delete only (can't delete other people's records). No Administration access. |
| **4. Sales Executive** | Regular user + custom Role **"Sales Exec"** | `Own` scope on Read/Edit/Delete for Lead, Contact, Account, Opportunity, Task, Call, Meeting, Email. `Team` **Read-only** so they have visibility into teammates' deals without editing them. No Export, no Mass Update, no Administration. |
| **5. Support/User** | Regular user + custom Role **"Support"** | `Own` scope on Read/Edit for Case, Contact, Document, Note. `No`/`Not Set` on Opportunity, Lead (sales pipeline hidden from support staff). Read-only `Team` on Contact/Account so they have context. |

## Steps to set this up

1. Log in as the bootstrap admin (`ESPOCRM_ADMIN_USERNAME` from `.env`).
2. **Administration → Teams** — create at least one Team (e.g. "Sales
   Team") and assign users to it. Team scope (used by Manager/Sales
   Exec) is meaningless without this.
3. **Administration → Roles → Create Role** — create the four custom
   roles above (Admin, Manager, Sales Exec, Support). For each, go
   through every relevant entity row and set the scope level per the
   table above.
4. **Administration → Users → Create User** — create one demo user per
   tier, assign the matching Role (or `Is Admin` for the Super Admin
   demo account), and add them to the Team.
5. **Verify** by logging in as each demo user in a private/incognito
   window and confirming they can/can't see what the tier implies (e.g.
   log in as Sales Exec and confirm you only see your own Leads, not a
   teammate's).

## Demo credentials to prepare for judges

Keep a short table of the 5 demo logins (username/password per tier) in
your final presentation — judges will expect to see the restriction live,
not just hear about it.
