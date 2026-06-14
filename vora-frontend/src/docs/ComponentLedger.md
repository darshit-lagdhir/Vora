# Vora Design System — Component Ledger & Specification

This ledger documents the core visual components engineered across the 20 phases of Project Vora. It functions as the visual truth blueprint for frontend scaling, ensuring complete alignment with the premium "5/10 Awwwards" styling guidelines.

---

## 1. Soft-Glass Modal (System Modal)

### Overview
A blur-backed dialog container implementing frosted glass aesthetics (glassmorphism) and spring-physics entry vectors.

### Design Tokens
- **Backdrop Blur**: `backdrop-filter: blur(16px)`
- **Frosted Fill**: `background: rgba(255, 255, 255, 0.05)`
- **Border Overlay**: `border: 1px solid rgba(255, 255, 255, 0.1)`
- **Shadow Profile**: `box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.5)`

### Props Interface
| Prop Name | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | Triggers active state and entry animations. | `false` |
| `onClose` | `function` | Callback invoked during exit clicks/escape key. | `() => {}` |
| `title` | `string` | Header text rendered in **Clash Display**. | `null` |
| `children` | `node` | Nested body elements. | `null` |

### Entry Animation (Framer Motion)
```javascript
const entryVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 } 
  }
};
```

---

## 2. High-Fidelity Input Architecture

### Overview
Custom text/number input wrappers implementing floating labels, real-time error states, and responsive glow transitions.

### Styling & States
- **Nominal state**: Frosted dark input with Satoshi prose typography.
- **Active focus**: Border color shifts to white/cyan with subtle transition glow.
- **Error state**: border changes to deep warning red with error banner.

### Props Interface
| Prop Name | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `label` | `string` | Floating placeholder label. | `""` |
| `value` | `any` | Controlled state value. | `""` |
| `onChange` | `function` | Input change listener. | `() => {}` |
| `error` | `string` | Real-time validation error string. | `null` |
| `type` | `string` | Element input type (text, password, etc.). | `"text"` |

---

## 3. Bento Ticket Chassis

### Overview
Frosted container displaying confirmation credentials, event summaries, and dynamically generated SVG QR codes.

### Styling Elements
- **Layout Matrix**: Balanced grid layouts prioritizing typographic contrast.
- **QR Wrapper**: Sleek border containing high-fidelity QR canvas with optimistic action buttons.

### Props Interface
| Prop Name | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `ticketHash` | `string` | Unique alphanumeric string used to render QR data. | `null` |
| `eventDetails` | `object` | Reference containing title, timestamps, and images. | `{}` |
| `onCheckIn` | `function` | Callback for validation testing actions. | `() => {}` |

---

## 4. Audience Presence Track

### Overview
A horizontal avatar track mapping active webcast audience attendees with overlapping avatar bounds.

### Typography & Spacing
- **Presence Count**: Monospace digital counters.
- **Overlap Offset**: Avatar overlap margin values to construct the offset profile.

### Props Interface
| Prop Name | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `activeUsers` | `array` | List of online user profiles (id, initials, role). | `[]` |
| `maxVisible` | `number` | Upper bound threshold of overlapping avatar icons. | `5` |

---

## 5. Defcon Lockdown Warning Ribbon

### Overview
Kinetic system override alert banner that drops down from the viewport ceiling on active critical lockdowns.

### Animation Profile
```javascript
const ribbonVariants = {
  hidden: { y: '-100%', opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: 'spring', bounce: 0.3, duration: 0.6 }
  }
};
```
