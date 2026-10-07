/* ==========================================================================
   Qevora AI SaaS — build configuration
   src/nav.mjs — Single source of truth for the sidebar navigation
   --------------------------------------------------------------------------
   The build script (tools/build.mjs) turns this into the sidebar markup for
   every page, so a link can never drift out of sync with the page inventory.

   item = {
     text    : sidebar label
     href    : path relative to the project root ("" = non-clickable group)
     icon    : Bootstrap Icons class
     badge   : optional { text, variant }
     children: optional submenu items
   }
   ========================================================================== */

export const nav = [
  {
    label: "Dashboard",
    items: [
      { text: "Overview", href: "index.html", icon: "bi-grid-1x2" },
      { text: "Analytics", href: "pages/analytics.html", icon: "bi-graph-up-arrow" }
    ]
  },
  {
    label: "Applications",
    items: [
      {
        text: "CRM",
        icon: "bi-people",
        children: [
          { text: "CRM Dashboard", href: "pages/crm.html" },
          { text: "Leads", href: "pages/leads.html" },
          { text: "Customers", href: "pages/customers.html" },
          { text: "Customer Details", href: "pages/customer-details.html" },
          { text: "Pipeline", href: "pages/pipeline.html" }
        ]
      },
      {
        text: "Projects",
        icon: "bi-kanban",
        children: [
          { text: "All Projects", href: "pages/projects.html" },
          { text: "Project Details", href: "pages/project-details.html" },
          { text: "Kanban Board", href: "pages/kanban.html" },
          { text: "Task List", href: "pages/tasks.html" }
        ]
      },
      { text: "Calendar", href: "pages/calendar.html", icon: "bi-calendar3" },
      { text: "Chat", href: "pages/chat.html", icon: "bi-chat-dots", badge: { text: "4", variant: "badge-soft-primary" } },
      { text: "Notifications", href: "pages/notifications.html", icon: "bi-bell" }
    ]
  },
  {
    label: "Business",
    items: [
      {
        text: "Catalog",
        icon: "bi-box-seam",
        children: [
          { text: "Products", href: "pages/products.html" },
          { text: "Product Details", href: "pages/product-details.html" }
        ]
      },
      {
        text: "Sales",
        icon: "bi-cart3",
        children: [
          { text: "Orders", href: "pages/orders.html" },
          { text: "Order Details", href: "pages/order-details.html" }
        ]
      },
      {
        text: "Finance",
        icon: "bi-cash-stack",
        children: [
          { text: "Invoices", href: "pages/invoices.html" },
          { text: "Invoice Details", href: "pages/invoice-details.html" },
          { text: "Payments", href: "pages/payments.html" },
          { text: "Transactions", href: "pages/transactions.html" }
        ]
      },
      { text: "Subscriptions", href: "pages/subscriptions.html", icon: "bi-arrow-repeat" }
    ]
  },
  {
    label: "AI Workspace",
    items: [
      { text: "AI Overview", href: "ai/dashboard.html", icon: "bi-stars" },
      { text: "AI Chat", href: "ai/chat.html", icon: "bi-chat-square-text", badge: { text: "New", variant: "badge-soft-success" } },
      { text: "Content Generator", href: "ai/content-generator.html", icon: "bi-pencil-square" },
      { text: "Image Generator", href: "ai/image-generator.html", icon: "bi-image" },
      { text: "AI Usage", href: "ai/usage.html", icon: "bi-speedometer2" },
      { text: "AI History", href: "ai/history.html", icon: "bi-clock-history" }
    ]
  },
  {
    label: "Management",
    items: [
      { text: "Team", href: "pages/team.html", icon: "bi-person-badge" },
      { text: "Roles & Permissions", href: "pages/roles.html", icon: "bi-shield-lock" },
      { text: "Activity Logs", href: "pages/activity.html", icon: "bi-list-check" },
      { text: "Reports", href: "pages/reports.html", icon: "bi-file-earmark-bar-graph" }
    ]
  },
  {
    label: "Workspace",
    items: [
      { text: "Profile", href: "pages/profile.html", icon: "bi-person-circle" },
      { text: "Settings", href: "pages/settings.html", icon: "bi-gear" },
      { text: "Pricing", href: "pages/pricing.html", icon: "bi-tags" },
      { text: "FAQ", href: "pages/faq.html", icon: "bi-question-circle" },
      { text: "Help Center", href: "pages/help.html", icon: "bi-life-preserver" }
    ]
  },
  {
    label: "UI Kit",
    items: [
      { text: "Components Index", href: "components/index.html", icon: "bi-collection" },
      {
        text: "Foundation",
        icon: "bi-palette",
        children: [
          { text: "Colors", href: "components/colors.html" },
          { text: "Typography", href: "components/typography.html" },
          { text: "Spacing", href: "components/spacing.html" },
          { text: "Grid", href: "components/grid.html" },
          { text: "Icons", href: "components/icons.html" }
        ]
      },
      {
        text: "Basic",
        icon: "bi-ui-checks",
        children: [
          { text: "Buttons", href: "components/buttons.html" },
          { text: "Badges", href: "components/badges.html" },
          { text: "Avatars", href: "components/avatars.html" },
          { text: "Alerts", href: "components/alerts.html" },
          { text: "Breadcrumbs", href: "components/breadcrumbs.html" }
        ]
      },
      {
        text: "Containers",
        icon: "bi-square",
        children: [
          { text: "Cards", href: "components/cards.html" },
          { text: "Pricing", href: "components/pricing.html" },
          { text: "Timeline", href: "components/timeline.html" },
          { text: "Empty States", href: "components/empty-states.html" }
        ]
      },
      {
        text: "Interaction",
        icon: "bi-mouse2",
        children: [
          { text: "Dropdowns", href: "components/dropdowns.html" },
          { text: "Modals", href: "components/modals.html" },
          { text: "Tabs", href: "components/tabs.html" },
          { text: "Accordions", href: "components/accordions.html" },
          { text: "Tooltips", href: "components/tooltips.html" },
          { text: "Toasts", href: "components/toasts.html" }
        ]
      },
      {
        text: "Forms",
        icon: "bi-input-cursor-text",
        children: [
          { text: "Form Controls", href: "components/forms.html" },
          { text: "Input Groups", href: "components/input-groups.html" },
          { text: "Select", href: "components/select.html" },
          { text: "File Upload", href: "components/file-upload.html" },
          { text: "Date & Time", href: "components/date-time.html" }
        ]
      },
      {
        text: "Data",
        icon: "bi-table",
        children: [
          { text: "Tables", href: "components/tables.html" },
          { text: "Pagination", href: "components/pagination.html" },
          { text: "Charts", href: "components/charts.html" }
        ]
      },
      {
        text: "Feedback",
        icon: "bi-activity",
        children: [
          { text: "Progress", href: "components/progress.html" },
          { text: "Spinners", href: "components/spinners.html" }
        ]
      }
    ]
  },
  {
    label: "Authentication",
    items: [
      { text: "Login", href: "auth/login.html", icon: "bi-box-arrow-in-right" },
      { text: "Register", href: "auth/register.html", icon: "bi-person-plus" },
      { text: "Forgot Password", href: "auth/forgot-password.html", icon: "bi-key" },
      { text: "Reset Password", href: "auth/reset-password.html", icon: "bi-shield-lock" },
      { text: "Verify Email", href: "auth/verify-email.html", icon: "bi-envelope-check" },
      { text: "Two Factor", href: "auth/two-factor.html", icon: "bi-phone" }
    ]
  },
  {
    label: "Utility",
    items: [
      { text: "404 Not Found", href: "utility/404.html", icon: "bi-signpost-split" },
      { text: "500 Server Error", href: "utility/500.html", icon: "bi-exclamation-octagon" },
      { text: "Maintenance", href: "utility/maintenance.html", icon: "bi-tools" },
      { text: "Coming Soon", href: "utility/coming-soon.html", icon: "bi-hourglass-split" },
      { text: "Terms & Conditions", href: "utility/terms.html", icon: "bi-file-earmark-text" },
      { text: "Privacy Policy", href: "utility/privacy.html", icon: "bi-shield-check" },
      { text: "Sitemap", href: "utility/sitemap.html", icon: "bi-diagram-3" }
    ]
  },
  {
    label: "Documentation",
    items: [
      { text: "Documentation", href: "documentation/index.html", icon: "bi-book" },
      { text: "Design System", href: "documentation/design-system.html", icon: "bi-layers" }
    ]
  }
];
