# Landing Page Configuration - Complete Feature Guide

## Overview
The landing page is now fully customizable by Super Admins. All changes apply globally to the landing page visible to all guests and users.

---

## 1. Navigation Bar Customization

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Branding Tab** → **Navigation Bar Section**

### Configurable Elements
- **Background Color**: Change nav background to any color (e.g., #ffffff for white, #1e1e1e for dark)
- **Text Color**: Change nav text color for contrast (e.g., #374151 for gray text, #ffffff for white text)
- **Logo**: Upload a logo image that appears in the top-left
- **Custom Pages Links**: Any custom page with "Display in Navigation" enabled will appear in the nav menu

### Example Configuration
```
Nav Background Color: #ffffff (white)
Nav Text Color: #374151 (gray)
Logo: company-logo.png
```

The navigation bar appears at the top of the landing page with:
- Logo/App Name on the left
- Custom pages navigation links (if enabled)
- Sign In button
- Try Demo button (if configured)

---

## 2. App Name Configuration

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Branding Tab** → **App Name Section**

### What Changes
- **Header**: App name displays instead of "OneApp" when no logo is present
- **Footer**: App name appears in the footer copyright text (© 2024 [App Name])
- **Global**: All references update automatically

### Example
If you set App Name to "DataHub":
- Nav bar shows: DataHub
- Footer shows: © 2024 DataHub. All rights reserved.

---

## 3. Navigation + Branding Colors

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Branding Tab** → **Colors Section**

### Customizable Colors
- **Primary Color**: Main accent color for buttons, highlights, pricing popular badges
- **Secondary Color**: Used in gradient backgrounds
- **Nav Background Color**: Navigation bar background
- **Nav Text Color**: Text color in navigation bar

---

## 4. Features Section

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Features Tab** → **Feature Cards Section**

### What You Can Do
- Add unlimited feature cards
- Set icon (emoji)
- Set title and description
- Visibility toggle
- Customize font sizes and weights

### Features Display
Features appear as a grid of cards with:
- Icon emoji
- Title
- Description
- Hover effect

---

## 5. Testimonials/Carousel Section

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Carousel Tab** → **Testimonials Section**

### Configurable Per Testimonial
- **Name**: Testimonial author name
- **Role**: Author's role/title
- **Feedback**: The testimonial text
- **Image**: Author's profile picture
- **Display on Nav**: Show/hide this testimonial

### Display Features
- Automatic carousel with dot navigation
- Click dots to navigate
- Image preview (circular)
- Feedback text in quotes

---

## 6. Pricing Section

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Pricing Tab** → **Pricing Plans Section**

### Configurable Per Plan
- **Name**: Plan name (e.g., Basic, Pro, Enterprise)
- **Price**: Numeric price value
- **Description**: Price descriptor (e.g., "per month")
- **Currency**: Set globally (e.g., USD, EUR, INR)
- **Features**: List of features (one per line)
- **Popular Badge**: Mark a plan as "Popular"

### Display Features
- Grid layout (3 columns on desktop)
- Color-coded popular plan with ring effect
- Feature list with checkmarks
- Get Started button (links to login)
- Hover scale animation

---

## 7. Call-to-Action (CTA) Section

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Content Tab** → **Call to Action Section**

### Configurable Elements
- **Title**: Main CTA heading
- **Subtitle**: Supporting text
- **Button Text**: CTA button label
- **Button Link**: Where button links to
- **Visibility**: Show/hide entire section
- **Font Sizes & Weights**: Customize typography

---

## 8. Custom Pages (NEW!)

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Pages Tab** → **Custom Pages Section**

### What You Can Do
1. **Create New Pages**
   - Title: Page heading
   - Slug: URL identifier (e.g., "about-us")
   - Content: HTML-supported content
   - Display in Navigation: Show link in nav bar

2. **Edit Pages**
   - Change any content, title, slug
   - Toggle navigation visibility
   - Update HTML content anytime

3. **Delete Pages**
   - Remove page completely

### Example Custom Page
```
Title: About Us
Slug: about-us
Content: 
  <h1>About Our Company</h1>
  <p>We help businesses...</p>
  <h2>Our Mission</h2>
  <p>To transform data...</p>
Display in Navigation: Yes
```

The page will:
- Appear as "About Us" link in the navigation menu
- Render the HTML content on a dedicated section
- Be accessible to all guests

---

## 9. Logo & Favicon

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Branding Tab** → **Logo & Favicon Section**

### What You Can Do
- Upload logo image (appears in nav bar and footer)
- Upload favicon (browser tab icon)
- View live previews
- Direct URL paste option

---

## 10. Font Customization

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Fonts Tab**

### Customizable For Each Section
- **Hero Title & Subtitle**
- **Features Title & Subtitle**
- **Carousel Title**
- **CTA Title & Subtitle**

### Adjustments Per Element
- Font Size (e.g., 36px, 48px)
- Font Weight (400, 500, 600, 700, 800, 900)

---

## 11. Demo Link

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Content Tab** → **Demo & Links Section**

### Configurable Elements
- **Demo Link**: URL to demo page
- **Demo Label**: Button text (e.g., "Try Demo")

### Where It Appears
- Navigation bar (right side)
- Hero section (next to Get Started button)

---

## 12. Registration Settings

### Location
**Super Admin Panel** → **Landing Page Configuration** → **Content Tab** → **Registration Settings Section**

### Option
- **Allow New Organization Registration**: 
  - ✅ ON: New orgs can register via landing page
  - ❌ OFF: Only existing orgs can add users

---

## Summary of Sections on Landing Page

1. **Navigation** (top sticky)
   - Logo/App Name
   - Custom pages (if enabled)
   - Sign In / Try Demo

2. **Hero Section**
   - Configurable title, subtitle
   - Hero image background
   - Get Started & Demo buttons
   - Color gradient overlay

3. **Features**
   - Grid of feature cards
   - Icon, title, description

4. **Carousel**
   - Testimonials with images
   - Dot navigation

5. **Pricing**
   - Plan cards with features
   - Popular badge option

6. **Custom Pages**
   - Rendered as full-width sections
   - HTML content supported

7. **CTA Section**
   - Call-to-action banner
   - Start Free Trial button

8. **Feedback**
   - Share Feedback form

9. **Footer**
   - App Name
   - Footer links (if configured)
   - Copyright text

---

## How to Use as Super Admin

### Step 1: Navigate to Landing Page Config
- Go to Super Admin Console
- Click "Landing Page" tab
- Select the config tab you want to edit

### Step 2: Make Changes
- Fill in fields
- Upload images
- Toggle visibility
- Add/remove items

### Step 3: Save
- Click "Save Configuration" button
- Changes apply immediately to all users

### Step 4: View Changes
- Open landing page in new tab
- Refresh to see live updates
- Test all interactive elements

---

## Important Notes

- **All changes are global** - they affect all users viewing the landing page
- **HTML is supported** in custom page content
- **Colors use hex format** (e.g., #2563eb)
- **Upload images** for best logo/favicon display
- **Custom pages** need a unique slug
- **Font sizes** should include units (px, em, rem)
- **Save after each edit** - changes are not auto-saved
