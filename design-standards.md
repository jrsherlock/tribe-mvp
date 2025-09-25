# Sangha Design Standards
*A comprehensive design system for the addiction recovery support platform*

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Standards](#component-standards)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Implementation Guidelines](#implementation-guidelines)
8. [Usage Examples](#usage-examples)

---

## Design Philosophy

### Core Principles
Sangha's design system is built around creating a **safe, supportive, and healing environment** for users on their recovery journey. Every design decision should reinforce these values:

- **Calm & Peaceful**: Colors and layouts that reduce anxiety and promote tranquility
- **Trustworthy**: Professional appearance that builds confidence in the platform
- **Supportive**: Warm, encouraging visual language that feels like a caring community
- **Accessible**: Inclusive design that works for users with diverse needs and abilities
- **Consistent**: Predictable patterns that reduce cognitive load and build familiarity

### Visual Tone
- **Soft & Gentle**: Rounded corners, subtle shadows, gentle gradients
- **Natural & Organic**: Earth-inspired colors that feel grounding
- **Clean & Uncluttered**: Plenty of whitespace to reduce overwhelm
- **Hopeful & Uplifting**: Subtle use of brighter accents to inspire optimism

---

## Color System

### Primary Palette
Our color system is designed to promote healing, trust, and emotional well-being.

#### Sage Green (Primary)
*Represents growth, healing, and new beginnings*
```css
--sage-50: #f6f8f6
--sage-100: #e8f0e8
--sage-200: #d1e1d1
--sage-300: #a8c8a8
--sage-400: #7ba87b
--sage-500: #5a8a5a  /* Primary brand color */
--sage-600: #4a7c4a
--sage-700: #3d653d
--sage-800: #335533
--sage-900: #2a462a
```

#### Ocean Blue (Secondary)
*Represents calm, stability, and trust*
```css
--ocean-50: #f0f9ff
--ocean-100: #e0f2fe
--ocean-200: #bae6fd
--ocean-300: #7dd3fc
--ocean-400: #38bdf8
--ocean-500: #0ea5e9
--ocean-600: #0284c7  /* Secondary brand color */
--ocean-700: #0369a1
--ocean-800: #075985
--ocean-900: #0c4a6e
```

#### Warm Sand (Neutral)
*Represents warmth, comfort, and grounding*
```css
--sand-50: #fafaf9
--sand-100: #f5f5f4
--sand-200: #e7e5e4
--sand-300: #d6d3d1
--sand-400: #a8a29e
--sand-500: #78716c
--sand-600: #57534e  /* Primary text color */
--sand-700: #44403c
--sand-800: #292524
--sand-900: #1c1917
```

### Accent Colors

#### Sunrise Orange (Hope & Energy)
*For positive actions, achievements, and encouragement*
```css
--sunrise-50: #fff7ed
--sunrise-100: #ffedd5
--sunrise-200: #fed7aa
--sunrise-300: #fdba74
--sunrise-400: #fb923c
--sunrise-500: #f97316  /* Hope accent */
--sunrise-600: #ea580c
--sunrise-700: #c2410c
--sunrise-800: #9a3412
--sunrise-900: #7c2d12
```

#### Lavender (Calm & Spirituality)
*For spiritual wellness, meditation, and peaceful moments*
```css
--lavender-50: #faf5ff
--lavender-100: #f3e8ff
--lavender-200: #e9d5ff
--lavender-300: #d8b4fe
--lavender-400: #c084fc
--lavender-500: #a855f7  /* Spiritual accent */
--lavender-600: #9333ea
--lavender-700: #7c3aed
--lavender-800: #6b21a8
--lavender-900: #581c87
```

### Status Colors

#### Success (Forest Green)
```css
--success-50: #f0fdf4
--success-100: #dcfce7
--success-200: #bbf7d0
--success-300: #86efac
--success-400: #4ade80
--success-500: #22c55e  /* Success state */
--success-600: #16a34a
--success-700: #15803d
--success-800: #166534
--success-900: #14532d
```

#### Warning (Amber)
```css
--warning-50: #fffbeb
--warning-100: #fef3c7
--warning-200: #fde68a
--warning-300: #fcd34d
--warning-400: #fbbf24
--warning-500: #f59e0b  /* Warning state */
--warning-600: #d97706
--warning-700: #b45309
--warning-800: #92400e
--warning-900: #78350f
```

#### Error (Soft Red)
```css
--error-50: #fef2f2
--error-100: #fee2e2
--error-200: #fecaca
--error-300: #fca5a5
--error-400: #f87171
--error-500: #ef4444  /* Error state */
--error-600: #dc2626
--error-700: #b91c1c
--error-800: #991b1b
--error-900: #7f1d1d
```

### Color Usage Guidelines

#### Primary Actions
- Use **Sage Green** for primary buttons, active states, and key CTAs
- Use **Ocean Blue** for secondary actions and informational elements

#### Emotional Context
- **Sage Green**: Growth, progress, positive check-ins
- **Ocean Blue**: Trust, stability, community features
- **Sunrise Orange**: Achievements, milestones, encouragement
- **Lavender**: Spiritual wellness, meditation, reflection
- **Warm Sand**: Body text, neutral backgrounds

#### Accessibility Requirements
- All color combinations must meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Never rely on color alone to convey information
- Provide alternative indicators (icons, text labels) alongside color coding

---

## Typography

### Font Family
**Inter** - A highly legible, modern sans-serif font designed for user interfaces.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale

#### Display Text
```css
.text-display-xl {
  font-size: 3.75rem;    /* 60px */
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.text-display-lg {
  font-size: 3rem;       /* 48px */
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.text-display-md {
  font-size: 2.25rem;    /* 36px */
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.025em;
}
```

#### Headings
```css
.text-h1 {
  font-size: 1.875rem;   /* 30px */
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.text-h2 {
  font-size: 1.5rem;     /* 24px */
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.text-h3 {
  font-size: 1.25rem;    /* 20px */
  line-height: 1.4;
  font-weight: 600;
}

.text-h4 {
  font-size: 1.125rem;   /* 18px */
  line-height: 1.4;
  font-weight: 600;
}
```

#### Body Text
```css
.text-body-lg {
  font-size: 1.125rem;   /* 18px */
  line-height: 1.6;
  font-weight: 400;
}

.text-body {
  font-size: 1rem;       /* 16px */
  line-height: 1.6;
  font-weight: 400;
}

.text-body-sm {
  font-size: 0.875rem;   /* 14px */
  line-height: 1.5;
  font-weight: 400;
}

.text-caption {
  font-size: 0.75rem;    /* 12px */
  line-height: 1.4;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Typography Guidelines

#### Hierarchy
1. Use display text for hero sections and major page titles
2. Use H1 for main page headings
3. Use H2-H4 for section headings and content organization
4. Use body text for readable content
5. Use captions for labels, metadata, and secondary information

#### Color Usage
- **Primary text**: `--sand-600` for main content
- **Secondary text**: `--sand-500` for supporting information
- **Muted text**: `--sand-400` for captions and metadata
- **Inverse text**: `white` on dark backgrounds

#### Accessibility
- Maintain minimum 16px font size for body text
- Use sufficient line height (1.5-1.6) for readability
- Ensure proper contrast ratios for all text colors
- Use semantic HTML headings for screen readers

## Spacing & Layout

### Spacing Scale
Consistent spacing creates visual rhythm and hierarchy. Use the 8px base unit system:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Layout Principles

#### Container Widths
```css
.container-sm { max-width: 640px; }   /* Small content */
.container-md { max-width: 768px; }   /* Forms, articles */
.container-lg { max-width: 1024px; }  /* Main content */
.container-xl { max-width: 1280px; }  /* Dashboard layouts */
```

#### Grid System
- Use CSS Grid for complex layouts
- Use Flexbox for component-level alignment
- Maintain consistent gutters (24px on desktop, 16px on mobile)

#### Responsive Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Layout Guidelines

#### Page Structure
1. **Header**: Fixed navigation with consistent height (64px)
2. **Main Content**: Centered with appropriate max-width
3. **Sidebar**: 280px width on desktop, collapsible on mobile
4. **Footer**: Minimal, contextual information only

#### Content Spacing
- **Section spacing**: 48px between major sections
- **Component spacing**: 24px between related components
- **Element spacing**: 16px between related elements
- **Text spacing**: 8px between paragraphs

#### Card Layouts
- **Padding**: 24px on desktop, 16px on mobile
- **Border radius**: 12px for cards, 8px for smaller elements
- **Shadow**: Subtle elevation using `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`

---

## Component Standards

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--sage-500);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--sage-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(90, 138, 90, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--sand-300);
  cursor: not-allowed;
  transform: none;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: var(--sage-600);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  border: 2px solid var(--sage-500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--sage-50);
  border-color: var(--sage-600);
}
```

#### Button Sizes
```css
.btn-sm { padding: 8px 16px; font-size: 14px; }
.btn-md { padding: 12px 24px; font-size: 16px; }
.btn-lg { padding: 16px 32px; font-size: 18px; }
```

### Form Elements

#### Input Fields
```css
.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--sand-200);
  border-radius: 8px;
  font-size: 16px;
  background: white;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--sage-500);
  box-shadow: 0 0 0 3px rgba(90, 138, 90, 0.1);
}

.input:invalid {
  border-color: var(--error-500);
}

.input::placeholder {
  color: var(--sand-400);
}
```

#### Labels
```css
.label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--sand-600);
  margin-bottom: 6px;
}

.label-required::after {
  content: " *";
  color: var(--error-500);
}
```

### Cards

#### Base Card
```css
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--sand-200);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

#### Card Variants
```css
.card-elevated {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-interactive {
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

### Navigation

#### Navigation Item
```css
.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  color: var(--sand-600);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--sage-50);
  color: var(--sage-700);
}

.nav-item.active {
  background: var(--sage-100);
  color: var(--sage-700);
  font-weight: 600;
}
```

### Status Indicators

#### Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background: var(--success-100);
  color: var(--success-700);
}

.badge-warning {
  background: var(--warning-100);
  color: var(--warning-700);
}

.badge-error {
  background: var(--error-100);
  color: var(--error-700);
}
```

#### Progress Indicators
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--sand-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sage-500), var(--sage-400));
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

## Accessibility Guidelines

### WCAG 2.1 AA Compliance
Sangha must be accessible to all users, including those with disabilities.

#### Color & Contrast
- **Text contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Interactive elements**: Minimum 3:1 contrast ratio for focus states
- **Color independence**: Never use color alone to convey information

#### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators with 2px outline
- Logical tab order throughout the application
- Skip links for main content areas

#### Screen Reader Support
- Semantic HTML structure with proper headings
- Alt text for all meaningful images
- ARIA labels for complex interactions
- Form labels properly associated with inputs

#### Motion & Animation
- Respect `prefers-reduced-motion` setting
- Provide pause/stop controls for auto-playing content
- Avoid flashing content that could trigger seizures

### Inclusive Design Principles

#### Cognitive Accessibility
- Clear, simple language appropriate for recovery context
- Consistent navigation and interaction patterns
- Adequate time limits with extension options
- Error prevention and clear error messages

#### Visual Accessibility
- Minimum 16px font size for body text
- Sufficient line spacing (1.5x font size minimum)
- High contrast mode support
- Scalable text up to 200% without horizontal scrolling

#### Motor Accessibility
- Minimum 44px touch targets on mobile
- Adequate spacing between interactive elements
- Support for various input methods
- Avoid time-sensitive interactions where possible

---

## Implementation Guidelines

### CSS Custom Properties
Define all design tokens as CSS custom properties in your root stylesheet:

```css
:root {
  /* Colors */
  --sage-50: #f6f8f6;
  --sage-500: #5a8a5a;
  --ocean-600: #0284c7;
  --sand-600: #57534e;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --text-h1: 1.875rem;
  --text-body: 1rem;

  /* Spacing */
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Tailwind CSS Configuration
Update your `tailwind.config.js` to use the new design system:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f6f8f6',
          500: '#5a8a5a',
          600: '#4a7c4a',
          // ... full scale
        },
        ocean: {
          50: '#f0f9ff',
          600: '#0284c7',
          // ... full scale
        },
        sand: {
          50: '#fafaf9',
          600: '#57534e',
          // ... full scale
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Use 8px base unit system
      }
    }
  }
}
```

### Component Development

#### File Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── layout/       # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Container.tsx
│   └── features/     # Feature-specific components
│       ├── Dashboard/
│       ├── Profile/
│       └── Checkin/
```

#### Component Guidelines
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Use composition patterns for flexibility
3. **Prop Validation**: Use TypeScript interfaces for all props
4. **Accessibility**: Include ARIA attributes and semantic HTML
5. **Testing**: Write unit tests for all components

#### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile`, `DailyCheckin`)
- **Props**: camelCase (e.g., `isActive`, `onClick`)
- **CSS Classes**: kebab-case (e.g., `btn-primary`, `card-elevated`)
- **Files**: PascalCase for components, camelCase for utilities

### Development Workflow

#### Design Review Process
1. **Design Approval**: All new components must follow these standards
2. **Code Review**: Check for accessibility and consistency
3. **Testing**: Verify keyboard navigation and screen reader support
4. **Documentation**: Update component documentation

#### Quality Checklist
- [ ] Follows color system guidelines
- [ ] Uses consistent spacing and typography
- [ ] Meets accessibility requirements
- [ ] Responsive across all breakpoints
- [ ] Includes proper TypeScript types
- [ ] Has appropriate hover/focus states
- [ ] Tested with keyboard navigation
- [ ] Tested with screen reader

---

## Usage Examples

### Button Implementation
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-sage-500 text-white hover:bg-sage-600 hover:shadow-md',
    secondary: 'bg-white text-sage-600 border-2 border-sage-500 hover:bg-sage-50',
    ghost: 'text-sage-600 hover:bg-sage-50'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Card Component
```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  onClick
}) => {
  const baseClasses = 'bg-white rounded-xl border border-sand-200 transition-all duration-200';

  const variantClasses = {
    default: 'shadow-sm',
    elevated: 'shadow-md',
    interactive: 'shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer'
  };

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
```

### Color Usage in Practice
```tsx
// Wellness dimension colors
const dimensionColors = {
  mental: 'sage',     // Growth and clarity
  emotional: 'ocean', // Calm and stability
  physical: 'success', // Health and vitality
  social: 'sunrise',   // Connection and warmth
  spiritual: 'lavender' // Peace and transcendence
};

// Status indicators
const statusColors = {
  excellent: 'success',
  good: 'sage',
  fair: 'warning',
  poor: 'error'
};
```

---

## Conclusion

This design system provides the foundation for creating a cohesive, accessible, and therapeutic user experience in Sangha. By following these guidelines, we ensure that every interaction supports users on their recovery journey with consistency, clarity, and compassion.

### Key Takeaways
1. **Consistency is healing** - Predictable patterns reduce cognitive load
2. **Accessibility is essential** - Everyone deserves access to recovery support
3. **Colors convey emotion** - Use our therapeutic palette intentionally
4. **Simplicity supports recovery** - Clean, uncluttered design reduces overwhelm

### Next Steps
1. Implement the new color system in `tailwind.config.js`
2. Create base UI components following these standards
3. Audit existing components for compliance
4. Update all pages to use the new design system
5. Conduct accessibility testing with real users

---

*This document is a living standard that will evolve with user feedback and platform growth. All changes should be documented and communicated to the development team.*
