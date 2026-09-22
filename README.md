# Chama Yangu

Build a mobile-first Kenyan chama management application called ChamaMkononi.

The purpose of the application is to digitize traditional Kenyan chamas while keeping the experience familiar, extremely simple, affordable, trustworthy, and accessible to people who may have limited digital literacy.

CORE DESIGN PHILOSOPHY

Do NOT design this like a Western fintech or corporate banking application.

Design it around how Kenyan chamas already operate physically: contribution books, treasurers, chairpersons, secretaries, meetings, loans, fines, group projects, and member records.

The target user includes:

- Young smartphone users

- Rural users

- Elderly users

- Users with limited digital literacy

- Users who primarily understand Kiswahili

- Users with limited or expensive mobile data

- Users using low-end Android phones

The application must feel familiar immediately.

A user should be able to understand the main screen without needing a tutorial.

USER INTERFACE

Use:

- Very large buttons

- Large readable typography

- High contrast

- Simple layouts

- Clear icons accompanied by text

- Minimal animations

- Minimal screens

- Very little scrolling

- Familiar Kenyan terminology

- Kiswahili-first terminology where appropriate

- Simple English as the alternative language

Avoid:

- Complex dashboards

- Tiny text

- Excessive menus

- Corporate terminology

- Complicated charts

- Unnecessary animations

- Western banking-style layouts

- Long forms

- Technical financial terminology

The home screen should contain approximately five major actions:

1. CONTRIBUTE

2. MY CHAMA

3. LOANS

4. MEETINGS

5. HELP

Use a bottom navigation system only if it improves simplicity.

HOME SCREEN

Show:

CHAMA NAME

Current chama balance

My contribution status

My loan balance

Next meeting

Recent chama announcement

The information should be understandable to an elderly user at a glance.

USER ROLES

Support:

1. Chairperson

2. Treasurer

3. Secretary

4. Ordinary Member

Each role must have appropriate permissions.

Implement strict role-based access control.

CONTRIBUTIONS

Allow members to:

- See their monthly contribution

- See whether they have paid

- Make a contribution

- View contribution history

- See outstanding contributions

Use simple wording such as:

"Umechanga?"

"Umebakiza KSh 500"

"Umeshachanga"

Instead of complicated financial terminology.

CHAMA BOOK

Create a digital version of the traditional chama contribution book.

Allow authorized officials to record:

Member

Amount

Date

Contribution type

Payment method

Members should be able to see their own records.

Authorized officials should be able to view group-wide contribution records.

LOANS

Allow members to:

- Request loans

- See loan balance

- See repayment dates

- See amount already repaid

- See amount remaining

Allow authorized committee members to:

- Review loan applications

- Approve loans

- Reject loans

- Record repayments

Use extremely simple language.

Example:

"Loan you owe"

"Amount to pay"

"Next payment"

MEETINGS

Allow the secretary/chairperson to create meetings containing:

Date

Time

Location

Agenda

Members can select:

"I AM COMING"

"I CANNOT COME"

Display the next meeting prominently.

Allow meeting minutes and attendance to be recorded.

MONEY TRANSPARENCY

Create a simple financial transparency section showing:

Money received

Money spent

Loans given

Loan repayments

Current balance

Every important transaction should show:

Amount

Date

Person who recorded it

Person who approved it, where applicable

Create an audit trail so transactions cannot silently disappear.

ELDERLY USER EXPERIENCE

Design specifically for elderly users.

Use:

- Large buttons

- Large text

- Clear confirmation screens

- Voice guidance where possible

- Minimal typing

- Simple language

- Icons plus text

- Confirmation before financial actions

Example:

"UNATAKA KUTUMA KSh 5,000?"

[NDIO — TUMA]

[HAPANA — RUDI]

Never rely on color alone to communicate important information.

VOICE

Design the architecture so voice interaction can be added.

Eventually a user should be able to say:

"Nimelipa mia tano ya chama."

The system should interpret:

Contribution = KSh 500

Then ask for confirmation before recording the transaction.

Support Kiswahili voice interaction where technically possible.

LANGUAGE

Support:

English

Kiswahili

Design the architecture so additional Kenyan languages can be added later.

Do not translate financial terminology literally if a simpler everyday expression is available.

LOW CONNECTIVITY

Design the application to be lightweight and offline-friendly.

Previously downloaded chama information should remain accessible without internet.

Queue appropriate non-sensitive actions for synchronization when connectivity returns.

Do not make the application dependent on high-speed internet.

LOW-END ANDROID

Optimize for inexpensive Android smartphones.

Keep:

- App size small

- Images compressed

- Animations minimal

- Network requests efficient

- Battery usage low

SECURITY

Implement:

Authentication

PIN

Biometric authentication where supported

Role-based permissions

Secure sessions

Transaction confirmation

Audit logs

Encrypted sensitive information

Secure API communication

For sensitive financial operations require additional confirmation.

TRUSTED HELPER

Allow an elderly member to designate a trusted person who can help them use the application.

Permissions must be granular.

A helper may be allowed to:

- View information

- Help navigate

- Assist with recording

But should NOT automatically have permission to:

- Withdraw money

- Approve loans

- Change account ownership

All sensitive actions must require appropriate authorization.

NOTIFICATIONS

Support friendly reminders through the appropriate channels.

Example:

"Habari Mama Wanjiku 👋

Umebakiza kuchangia KSh 500 ya mwezi huu.

Tafadhali lipa kabla ya Jumapili."

Do not use threatening or overly technical language.

FUTURE INTEGRATIONS

Design the architecture so the application can later integrate with:

M-Pesa

SMS

USSD

WhatsApp

Voice services

Banks

Mobile money services

Do not pretend integrations exist if they have not been implemented.

Use clearly marked mock services during development.

FUTURE FEATURES

Design the database and architecture so these can later be added:

- Chama investments

- Group projects

- Group assets

- Savings goals

- Financial reports

- Multiple chamas per user

- Digital receipts

- Fraud/anomaly detection

- AI chama assistant

- More Kenyan languages

- USSD access

- SMS access

TECHNICAL REQUIREMENTS

Create a clean, scalable architecture with:

Frontend

Backend/API

Database

Authentication

Role-based authorization

Audit logging

Notification system

Use reusable components.

Separate UI, business logic, authentication, financial calculations, and data access.

Never hard-code financial balances.

All financial calculations should be performed reliably on the backend.

DEMO DATA

Create realistic Kenyan demo data:

Chama: "Tupendane Women Group"

Members:

- Mama Wanjiku

- Mama Akinyi

- Mama Njeri

- Mama Wambui

- Mama Atieno

Use Kenyan currency:

KSh

Create realistic contribution, loan, meeting, and transaction examples.

MOST IMPORTANT REQUIREMENT

The application must pass this test:

Give the phone to a 60-year-old Kenyan chama member who has never used the application.

If she can understand:

- How much she has contributed

- Whether she owes money

- When the next meeting is

- How to contact/help the chama

- How to make a contribution

without somebody explaining every screen, the design is successful.

Prioritize simplicity, trust, familiarity, accessibility, Kenyan context, and financial transparency over visual complexity.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f14e191c-fcf2-4334-964b-cb230a2d983d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
