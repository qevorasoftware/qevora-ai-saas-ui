/* ==========================================================================
   Qevora AI SaaS UI — build configuration
   src/pages.mjs — Page inventory
   --------------------------------------------------------------------------
   Every output page is listed here exactly once. This file is also the page
   inventory referenced by the documentation, so the advertised page count
   always matches what the template actually ships.

   out       : output path, relative to the project root
   meta.title: <title> and the page heading
   meta.desc : <meta name="description">
   layout    : "app"    full dashboard shell (sidebar + header + footer)
               "blank"  full-width page (authentication / utility)
   breadcrumb: array of labels; the last entry is the current page
   source    : body content file (defaults to src/pages/<out>)
   ========================================================================== */

/* Charts are only loaded on pages that actually render a chart. */
const CHART_SCRIPTS = ["assets/js/chart.umd.js", "assets/js/pages/charts.js"];

/* The chat workspace script is only loaded on the two chat pages. */
const CHAT_SCRIPTS = ["assets/js/pages/chat.js"];

/* The calendar engine is only loaded on the calendar page. */
const CALENDAR_SCRIPTS = ["assets/js/pages/calendar.js"];

/* OTP inputs and countdowns — authentication and utility pages only. */
const AUTH_SCRIPTS = ["assets/js/pages/auth.js"];

export const pages = [
  /* ---------------------------------------------------------------- Dashboard */
  {
    out: "index.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Dashboard", "Overview"],
    meta: {
      title: "Dashboard Overview | Qevora AI SaaS UI",
      desc: "Qevora AI SaaS UI dashboard overview — revenue, active users, AI usage, projects and team activity in one Bootstrap 5 admin view."
    }
  },
  {
    out: "pages/analytics.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Dashboard", "Analytics"],
    meta: {
      title: "Analytics | Qevora AI SaaS UI",
      desc: "Traffic, conversion, revenue and channel analytics with reusable Chart.js components."
    }
  },

  /* ------------------------------------------------------------- Applications */
  {
    out: "pages/crm.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "CRM", "Dashboard"],
    meta: {
      title: "CRM Dashboard | Qevora AI SaaS UI",
      desc: "CRM dashboard with pipeline value, lead sources, deals closing soon and recent customer activity."
    }
  },
  {
    out: "pages/leads.html",
    breadcrumb: ["Applications", "CRM", "Leads"],
    meta: {
      title: "Leads | Qevora AI SaaS UI",
      desc: "Lead list with status, owner, source, score and value — includes filtering and a data table."
    }
  },
  {
    out: "pages/customers.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "CRM", "Customers"],
    meta: {
      title: "Customers | Qevora AI SaaS UI",
      desc: "Customer directory with company, plan, lifetime value, status and detail-page navigation."
    }
  },
  {
    out: "pages/customer-details.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "CRM", "Customers", "Northstar Labs"],
    meta: {
      title: "Customer Details | Qevora AI SaaS UI",
      desc: "Customer profile with contact details, subscription, invoices, activity timeline and notes."
    }
  },
  {
    out: "pages/pipeline.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "CRM", "Pipeline"],
    meta: {
      title: "Sales Pipeline | Qevora AI SaaS UI",
      desc: "Deal pipeline board with stage totals, weighted forecast and draggable deal cards."
    }
  },
  {
    out: "pages/projects.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "Projects", "All Projects"],
    meta: {
      title: "Projects | Qevora AI SaaS UI",
      desc: "Project portfolio with progress, team members, budget, deadline and status filters."
    }
  },
  {
    out: "pages/project-details.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Applications", "Projects", "Project Details"],
    meta: {
      title: "Project Details | Qevora AI SaaS UI",
      desc: "Project overview with progress, tasks, files, team and activity timeline."
    }
  },
  {
    out: "pages/kanban.html",
    breadcrumb: ["Applications", "Projects", "Kanban Board"],
    meta: {
      title: "Kanban Board | Qevora AI SaaS UI",
      desc: "Drag-and-drop Kanban board for task planning across backlog, in progress, review and done."
    }
  },
  {
    out: "pages/tasks.html",
    breadcrumb: ["Applications", "Projects", "Task List"],
    meta: {
      title: "Tasks | Qevora AI SaaS UI",
      desc: "Task list with priority, assignee, due date, labels and completion state."
    }
  },
  {
    out: "pages/calendar.html",
    scripts: CALENDAR_SCRIPTS,
    breadcrumb: ["Applications", "Calendar"],
    meta: {
      title: "Calendar | Qevora AI SaaS UI",
      desc: "Month calendar view with scheduled meetings, deadlines and agenda sidebar."
    }
  },
  {
    out: "pages/chat.html",
    scripts: CHAT_SCRIPTS,
    breadcrumb: ["Applications", "Chat"],
    meta: {
      title: "Team Chat | Qevora AI SaaS UI",
      desc: "Team chat workspace with conversation list, message thread and composer."
    }
  },
  {
    out: "pages/notifications.html",
    breadcrumb: ["Applications", "Notifications"],
    meta: {
      title: "Notifications | Qevora AI SaaS UI",
      desc: "Notification center with filters, read states and grouped activity."
    }
  },

  /* ----------------------------------------------------------------- Business */
  {
    out: "pages/products.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Business", "Catalog", "Products"],
    meta: {
      title: "Products | Qevora AI SaaS UI",
      desc: "Product catalog with grid and table views, stock, price and category management."
    }
  },
  {
    out: "pages/product-details.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Business", "Catalog", "Product Details"],
    meta: {
      title: "Product Details | Qevora AI SaaS UI",
      desc: "Product detail view with pricing, inventory, variants and related items."
    }
  },
  {
    out: "pages/orders.html",
    breadcrumb: ["Business", "Sales", "Orders"],
    meta: {
      title: "Orders | Qevora AI SaaS UI",
      desc: "Order management table with payment status, fulfilment state and totals."
    }
  },
  {
    out: "pages/order-details.html",
    breadcrumb: ["Business", "Sales", "Orders", "#QV-20418"],
    meta: {
      title: "Order Details | Qevora AI SaaS UI",
      desc: "Order detail view with line items, customer, shipping and payment summary."
    }
  },
  {
    out: "pages/invoices.html",
    breadcrumb: ["Business", "Finance", "Invoices"],
    meta: {
      title: "Invoices | Qevora AI SaaS UI",
      desc: "Invoice list with paid, pending and overdue states plus downloadable invoice detail view."
    }
  },
  {
    out: "pages/invoice-details.html",
    breadcrumb: ["Business", "Finance", "Invoices", "INV-2026-0184"],
    meta: {
      title: "Invoice Details | Qevora AI SaaS UI",
      desc: "Printable invoice layout with line items, tax summary, totals and payment history."
    }
  },
  {
    out: "pages/payments.html",
    breadcrumb: ["Business", "Finance", "Payments"],
    meta: {
      title: "Payments | Qevora AI SaaS UI",
      desc: "Payment records with method, gateway, status and settlement information."
    }
  },
  {
    out: "pages/transactions.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Business", "Finance", "Transactions"],
    meta: {
      title: "Transactions | Qevora AI SaaS UI",
      desc: "Transaction ledger with credits, refunds, fees and running balance."
    }
  },
  {
    out: "pages/subscriptions.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Business", "Subscriptions"],
    meta: {
      title: "Subscriptions | Qevora AI SaaS UI",
      desc: "Subscription management with plans, billing cycles, seats, renewals and churn metrics."
    }
  },

  /* ----------------------------------------------------------------------- AI */
  {
    out: "ai/dashboard.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["AI Workspace", "AI Overview"],
    meta: {
      title: "AI Overview | Qevora AI SaaS UI",
      desc: "AI workspace overview with requests, tokens, model usage, plan limits and recent generations."
    }
  },
  {
    out: "ai/chat.html",
    scripts: CHAT_SCRIPTS,
    breadcrumb: ["AI Workspace", "AI Chat"],
    meta: {
      title: "AI Chat | Qevora AI SaaS UI",
      desc: "AI chat interface with conversation sidebar, prompt composer, regenerate and copy actions."
    }
  },
  {
    out: "ai/content-generator.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["AI Workspace", "Content Generator"],
    meta: {
      title: "AI Content Generator | Qevora AI SaaS UI",
      desc: "AI writing workspace with templates, tone controls, prompt settings and generated output."
    }
  },
  {
    out: "ai/image-generator.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["AI Workspace", "Image Generator"],
    meta: {
      title: "AI Image Generator | Qevora AI SaaS UI",
      desc: "AI image generation UI with prompt, style presets, aspect ratio and generated gallery."
    }
  },
  {
    out: "ai/usage.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["AI Workspace", "AI Usage"],
    meta: {
      title: "AI Usage | Qevora AI SaaS UI",
      desc: "AI usage and quota reporting with token consumption, cost breakdown and per-model usage."
    }
  },
  {
    out: "ai/history.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["AI Workspace", "AI History"],
    meta: {
      title: "AI History | Qevora AI SaaS UI",
      desc: "Prompt history with model, tokens, latency, cost and reuse actions."
    }
  },

  /* --------------------------------------------------------------- Management */
  {
    out: "pages/team.html",
    breadcrumb: ["Management", "Team"],
    meta: {
      title: "Team | Qevora AI SaaS UI",
      desc: "Team directory with roles, departments, workload and member detail cards."
    }
  },
  {
    out: "pages/roles.html",
    breadcrumb: ["Management", "Roles & Permissions"],
    meta: {
      title: "Roles & Permissions | Qevora AI SaaS UI",
      desc: "Role management with a permission matrix for admin, manager, analyst and support roles."
    }
  },
  {
    out: "pages/activity.html",
    breadcrumb: ["Management", "Activity Logs"],
    meta: {
      title: "Activity Logs | Qevora AI SaaS UI",
      desc: "Audit log with actor, action, target, IP and timestamp filters."
    }
  },
  {
    out: "pages/reports.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Management", "Reports"],
    meta: {
      title: "Reports | Qevora AI SaaS UI",
      desc: "Report library with saved reports, scheduled exports and download history."
    }
  },

  /* ------------------------------------------------------------------ Workspace */
  {
    out: "pages/profile.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Workspace", "Profile"],
    meta: {
      title: "Profile | Qevora AI SaaS UI",
      desc: "User profile with header card, activity, projects and contact information."
    }
  },
  {
    out: "pages/settings.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["Workspace", "Settings"],
    meta: {
      title: "Settings | Qevora AI SaaS UI",
      desc: "Account settings with profile, workspace, notifications, security and appearance sections."
    }
  },
  {
    out: "pages/pricing.html",
    breadcrumb: ["Workspace", "Pricing"],
    meta: {
      title: "Pricing | Qevora AI SaaS UI",
      desc: "Pricing plans with monthly and annual toggle, feature comparison and FAQ."
    }
  },
  {
    out: "pages/faq.html",
    breadcrumb: ["Workspace", "FAQ"],
    meta: {
      title: "FAQ | Qevora AI SaaS UI",
      desc: "Frequently asked questions grouped by billing, workspace, AI usage and security."
    }
  },
  {
    out: "pages/help.html",
    breadcrumb: ["Workspace", "Help Center"],
    meta: {
      title: "Help Center | Qevora AI SaaS UI",
      desc: "Help center with search, topic categories, popular articles and support contact options."
    }
  },

  /* ------------------------------------------------------------- Components */
  {
    out: "components/index.html",
    breadcrumb: ["UI Kit", "Components"],
    meta: {
      title: "Component Library | Qevora AI SaaS UI",
      desc: "Browse every Qevora Bootstrap 5 component with live previews, copy-ready HTML and usage notes."
    }
  },
  {
    out: "components/colors.html",
    breadcrumb: ["UI Kit", "Foundation", "Colors"],
    meta: {
      title: "Colors | Qevora AI SaaS UI Kit",
      desc: "Colour tokens for the Qevora design system, including light and dark theme values."
    }
  },
  {
    out: "components/typography.html",
    breadcrumb: ["UI Kit", "Foundation", "Typography"],
    meta: {
      title: "Typography | Qevora AI SaaS UI Kit",
      desc: "Heading scale, body text, muted text, links and code styling used across the template."
    }
  },
  {
    out: "components/spacing.html",
    breadcrumb: ["UI Kit", "Foundation", "Spacing"],
    meta: {
      title: "Spacing | Qevora AI SaaS UI Kit",
      desc: "Spacing scale and layout rhythm used by the Qevora design system."
    }
  },
  {
    out: "components/grid.html",
    breadcrumb: ["UI Kit", "Foundation", "Grid"],
    meta: {
      title: "Grid | Qevora AI SaaS UI Kit",
      desc: "Bootstrap 5 grid examples used for dashboard layouts, cards and forms."
    }
  },
  {
    out: "components/icons.html",
    breadcrumb: ["UI Kit", "Foundation", "Icons"],
    meta: {
      title: "Icons | Qevora AI SaaS UI Kit",
      desc: "Bootstrap Icons usage, sizing, colour and a curated icon gallery."
    }
  },
  {
    out: "components/buttons.html",
    breadcrumb: ["UI Kit", "Basic", "Buttons"],
    meta: {
      title: "Buttons | Qevora AI SaaS UI Kit",
      desc: "Solid, outline, soft, ghost, gradient, icon and loading button variations with copy-ready code."
    }
  },
  {
    out: "components/badges.html",
    breadcrumb: ["UI Kit", "Basic", "Badges"],
    meta: {
      title: "Badges | Qevora AI SaaS UI Kit",
      desc: "Status badges, soft badges, dot badges and counters with copy-ready HTML."
    }
  },
  {
    out: "components/avatars.html",
    breadcrumb: ["UI Kit", "Basic", "Avatars"],
    meta: {
      title: "Avatars | Qevora AI SaaS UI Kit",
      desc: "Avatar sizes, shapes, gradients, status indicators and avatar groups."
    }
  },
  {
    out: "components/alerts.html",
    breadcrumb: ["UI Kit", "Basic", "Alerts"],
    meta: {
      title: "Alerts | Qevora AI SaaS UI Kit",
      desc: "Soft, solid and dismissible alerts for success, warning, error and info states."
    }
  },
  {
    out: "components/breadcrumbs.html",
    breadcrumb: ["UI Kit", "Basic", "Breadcrumbs"],
    meta: {
      title: "Breadcrumbs | Qevora AI SaaS UI Kit",
      desc: "Breadcrumb styles including icon separators and the dashboard page header bar."
    }
  },
  {
    out: "components/cards.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["UI Kit", "Containers", "Cards"],
    meta: {
      title: "Cards | Qevora AI SaaS UI Kit",
      desc: "Base cards, KPI cards, profile cards, feature cards and hoverable card layouts."
    }
  },
  {
    out: "components/pricing.html",
    breadcrumb: ["UI Kit", "Containers", "Pricing"],
    meta: {
      title: "Pricing Blocks | Qevora AI SaaS UI Kit",
      desc: "Pricing card layout with featured plan, billing toggle and feature lists."
    }
  },
  {
    out: "components/timeline.html",
    breadcrumb: ["UI Kit", "Containers", "Timeline"],
    meta: {
      title: "Timeline | Qevora AI SaaS UI Kit",
      desc: "Vertical timeline and activity feed components used across detail pages."
    }
  },
  {
    out: "components/empty-states.html",
    breadcrumb: ["UI Kit", "Containers", "Empty States"],
    meta: {
      title: "Empty States | Qevora AI SaaS UI Kit",
      desc: "Empty, error and loading state blocks with icons, copy and actions."
    }
  },
  {
    out: "components/dropdowns.html",
    breadcrumb: ["UI Kit", "Interaction", "Dropdowns"],
    meta: {
      title: "Dropdowns | Qevora AI SaaS UI Kit",
      desc: "Dropdown menus, split buttons, notification panels and user menus."
    }
  },
  {
    out: "components/modals.html",
    breadcrumb: ["UI Kit", "Interaction", "Modals"],
    meta: {
      title: "Modals | Qevora AI SaaS UI Kit",
      desc: "Modal dialogs, sizes, confirmation dialogs and scrollable content."
    }
  },
  {
    out: "components/tabs.html",
    breadcrumb: ["UI Kit", "Interaction", "Tabs"],
    meta: {
      title: "Tabs | Qevora AI SaaS UI Kit",
      desc: "Tabs, pills and vertical navigation patterns with copy-ready markup."
    }
  },
  {
    out: "components/accordions.html",
    breadcrumb: ["UI Kit", "Interaction", "Accordions"],
    meta: {
      title: "Accordions | Qevora AI SaaS UI Kit",
      desc: "Accordion and collapse components with flush and separated variants."
    }
  },
  {
    out: "components/tooltips.html",
    breadcrumb: ["UI Kit", "Interaction", "Tooltips"],
    meta: {
      title: "Tooltips & Popovers | Qevora AI SaaS UI Kit",
      desc: "Tooltip and popover placement options with accessible trigger markup."
    }
  },
  {
    out: "components/toasts.html",
    breadcrumb: ["UI Kit", "Interaction", "Toasts"],
    meta: {
      title: "Toasts | Qevora AI SaaS UI Kit",
      desc: "Toast notifications for success, warning, error and info feedback."
    }
  },
  {
    out: "components/forms.html",
    breadcrumb: ["UI Kit", "Forms", "Form Controls"],
    meta: {
      title: "Form Controls | Qevora AI SaaS UI Kit",
      desc: "Inputs, textareas, checks, radios, switches, range and validation states."
    }
  },
  {
    out: "components/input-groups.html",
    breadcrumb: ["UI Kit", "Forms", "Input Groups"],
    meta: {
      title: "Input Groups | Qevora AI SaaS UI Kit",
      desc: "Input groups with icons, buttons, prefixes and suffixes."
    }
  },
  {
    out: "components/select.html",
    breadcrumb: ["UI Kit", "Forms", "Select"],
    meta: {
      title: "Select & Multiselect | Qevora AI SaaS UI Kit",
      desc: "Native selects, sizing, multiple selection, search field and tag selectors."
    }
  },
  {
    out: "components/file-upload.html",
    breadcrumb: ["UI Kit", "Forms", "File Upload"],
    meta: {
      title: "File Upload | Qevora AI SaaS UI Kit",
      desc: "Dropzone, file list and attachment components."
    }
  },
  {
    out: "components/date-time.html",
    breadcrumb: ["UI Kit", "Forms", "Date & Time"],
    meta: {
      title: "Date & Time Inputs | Qevora AI SaaS UI Kit",
      desc: "Date, time, month and datetime-local inputs with helper text and validation."
    }
  },
  {
    out: "components/tables.html",
    breadcrumb: ["UI Kit", "Data", "Tables"],
    meta: {
      title: "Tables | Qevora AI SaaS UI Kit",
      desc: "Tables with toolbar, selection, sorting, pagination and empty state."
    }
  },
  {
    out: "components/pagination.html",
    breadcrumb: ["UI Kit", "Data", "Pagination"],
    meta: {
      title: "Pagination | Qevora AI SaaS UI Kit",
      desc: "Pagination styles, page size selectors and table footers."
    }
  },
  {
    out: "components/charts.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["UI Kit", "Data", "Charts"],
    meta: {
      title: "Charts | Qevora AI SaaS UI Kit",
      desc: "Line, area, bar, stacked bar and doughnut charts built on Chart.js with theme support."
    }
  },
  {
    out: "components/progress.html",
    scripts: CHART_SCRIPTS,
    breadcrumb: ["UI Kit", "Feedback", "Progress"],
    meta: {
      title: "Progress | Qevora AI SaaS UI Kit",
      desc: "Progress bars, stacked progress, circular rings, skeletons and counters."
    }
  },
  {
    out: "components/spinners.html",
    breadcrumb: ["UI Kit", "Feedback", "Spinners"],
    meta: {
      title: "Spinners | Qevora AI SaaS UI Kit",
      desc: "Bootstrap spinners and the Qevora loading spinner in every size and colour."
    }
  },

  /* ----------------------------------------------------------- Authentication */
  {
    out: "auth/login.html",
    layout: "blank",
    breadcrumb: ["Authentication", "Login"],
    meta: {
      title: "Login | Qevora AI SaaS UI",
      desc: "Sign-in page with email and password fields, remember me, social sign-in and demo validation."
    }
  },
  {
    out: "auth/register.html",
    layout: "blank",
    breadcrumb: ["Authentication", "Register"],
    meta: {
      title: "Create Account | Qevora AI SaaS UI",
      desc: "Registration page with name, work email, password strength meter and terms checkbox."
    }
  },
  {
    out: "auth/forgot-password.html",
    layout: "blank",
    breadcrumb: ["Authentication", "Forgot Password"],
    meta: {
      title: "Forgot Password | Qevora AI SaaS UI",
      desc: "Password recovery page that requests a reset link by email."
    }
  },
  {
    out: "auth/reset-password.html",
    layout: "blank",
    breadcrumb: ["Authentication", "Reset Password"],
    meta: {
      title: "Reset Password | Qevora AI SaaS UI",
      desc: "Set a new password with strength meter and confirmation field."
    }
  },
  {
    out: "auth/verify-email.html",
    layout: "blank",
    scripts: AUTH_SCRIPTS,
    breadcrumb: ["Authentication", "Verify Email"],
    meta: {
      title: "Verify Email | Qevora AI SaaS UI",
      desc: "Email verification page with six-digit code input and resend action."
    }
  },
  {
    out: "auth/two-factor.html",
    layout: "blank",
    scripts: AUTH_SCRIPTS,
    breadcrumb: ["Authentication", "Two Factor"],
    meta: {
      title: "Two Factor Authentication | Qevora AI SaaS UI",
      desc: "Two-factor authentication page with authenticator code input and recovery option."
    }
  },

  /* ---------------------------------------------------------------- Utility */
  {
    out: "utility/404.html",
    layout: "blank",
    breadcrumb: ["Utility", "404"],
    meta: {
      title: "404 Not Found | Qevora AI SaaS UI",
      desc: "Not found page with search suggestion and navigation back to the dashboard."
    }
  },
  {
    out: "utility/500.html",
    layout: "blank",
    breadcrumb: ["Utility", "500"],
    meta: {
      title: "500 Server Error | Qevora AI SaaS UI",
      desc: "Server error page with status line, retry action and support link."
    }
  },
  {
    out: "utility/maintenance.html",
    layout: "blank",
    breadcrumb: ["Utility", "Maintenance"],
    meta: {
      title: "Maintenance | Qevora AI SaaS UI",
      desc: "Scheduled maintenance page with status details and notification signup."
    }
  },
  {
    out: "utility/terms.html",
    breadcrumb: ["Utility", "Terms & Conditions"],
    meta: {
      title: "Terms & Conditions | Qevora AI SaaS UI",
      desc: "Sample terms of service for a SaaS product: accounts, billing, acceptable use, AI output, liability and dispute terms."
    }
  },
  {
    out: "utility/privacy.html",
    breadcrumb: ["Utility", "Privacy Policy"],
    meta: {
      title: "Privacy Policy | Qevora AI SaaS UI",
      desc: "Sample privacy policy for a SaaS product: what is collected, how AI prompts are handled, retention, security and user rights."
    }
  },
  {
    out: "utility/sitemap.html",
    breadcrumb: ["Utility", "Sitemap"],
    meta: {
      title: "Sitemap | Qevora AI SaaS UI",
      desc: "Every page in the package on one screen, grouped by module with a one-line description of each."
    }
  },
  {
    out: "utility/coming-soon.html",
    layout: "blank",
    scripts: AUTH_SCRIPTS,
    breadcrumb: ["Utility", "Coming Soon"],
    meta: {
      title: "Coming Soon | Qevora AI SaaS UI",
      desc: "Coming soon page with launch countdown and email capture."
    }
  },

  /* ---------------------------------------------------------- Documentation */
  {
    out: "documentation/index.html",
    breadcrumb: ["Documentation", "Getting Started"],
    meta: {
      title: "Documentation | Qevora AI SaaS UI",
      desc: "Installation, folder structure, customisation and component usage guide for the Qevora AI SaaS UI template."
    }
  },
  {
    out: "documentation/design-system.html",
    breadcrumb: ["Documentation", "Design System"],
    meta: {
      title: "Design System | Qevora AI SaaS UI",
      desc: "Colour, typography, spacing, radius, shadow and breakpoint specification for the Qevora design system."
    }
  }
];
