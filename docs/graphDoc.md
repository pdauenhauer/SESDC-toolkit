

## Overview

Our application will use a two-tier approach for visualizing simulation data:

1. **Static graphs** generated on the backend using Matplotlib.
2. **Interactive graphs** rendered on the frontend using uPlot.

This approach balances performance, accessibility, and advanced analysis features.

---

## Goals

- Provide fast-loading charts on all devices.
- Support interactive exploration of simulation results.
- Minimize bandwidth, CPU, and memory usage.
- Enable viewing partial sections of simulations.
- Scale to larger datasets in the future.

---

## Static Graphs (Matplotlib)

### Purpose

Static graphs are used for:

- Dashboards
- Summary views
- Reports
- Exportable images
- Easy downloads

They provide a quick overview of simulation results.

### Benefits

- Very fast load time
- Works on all devices and browsers
- Highly cacheable
- No client-side rendering cost
- Reliable fallback if interactive charts are unavailable

Static graphs are the default visualization option.

---

## Interactive Graphs (uPlot)

### Purpose

Interactive graphs are used for detailed analysis and exploration.

They allow users to:

- Zoom and pan through time
- Inspect values with tooltips
- Toggle metrics on and off
- Focus on specific simulation windows

These graphs can be rendered as an "advanced" option, offering a more complex view.

---

## Why uPlot

uPlot was chosen as the primary charting library because it is optimized for performance and scalability, which are very core to the application vision.

### Key Technical Benefits

#### High Performance
- Lightweight and fast rendering
- Handles large time-series datasets efficiently
- Performs well on older or low-power devices

#### Partial and Windowed Data Loading
- Only requested time ranges are loaded
- Data can be reloaded when users zoom
- Avoids transferring full simulation datasets

This supports smooth interaction even with long simulations.

#### Efficient Data Handling
- Works well with column-based time-series data
- Low memory overhead
- Fast redraws

#### Customizability
- Plugin and hook system
- Supports custom legends, tooltips, and overlays
- Allows sponsor-specific visualization features

Customization is implemented in our own wrapper components.

#### Low Resource Usage
- Small download size
- Low CPU and memory usage
- Fast startup time

This supports users on slow connections and legacy hardware.

---

## Backend Design Considerations

To support interactive charts efficiently:

- The backend provides time-windowed data endpoints.
- Clients request only selected metrics.
- Optional downsampling limits payload size.
- Responses are cached when possible.

This ensures predictable performance and cost control.

---

## Frontend Integration

Interactive charts are wrapped in a reusable Preact component.

This component is responsible for:

- Initializing uPlot
- Managing user interactions
- Handling data reloading
- Applying formatting and themes

All chart-related complexity is centralized in one place.

---

## Alternative: Plotly.js

### Overview

Plotly.js is a feature-rich interactive charting library that may be used as an alternative should we decide one is needed.

### Advantages

- Polished default appearance
- Rich built-in interactivity
- Minimal custom UI required
- Large ecosystem and documentation

### Disadvantages

- Large bundle size
- Higher CPU and memory usage
- Slower startup on weaker devices

### When to Consider Plotly

Plotly may be considered if:

- Visual polish is a higher priority than performance
- uPlot proves to be too difficult to implement
- Bundle size is less important
- Interactive charts are used sparingly

### Pivot Strategy

If we switch to Plotly:

- Replace uPlot in the chart wrapper
- Keep backend APIs unchanged
- Preserve windowed data loading
- Continue lazy-loading on demand

The overall architecture remains the same.

---


## Risks and Mitigations

### Increased Complexity
Two rendering paths are maintained.

Mitigation:
- Shared configuration
- Common data APIs

### Manual UI Work
uPlot requires custom UI components.

Mitigation:
- Build reusable wrappers
- Standardize chart behavior

### Visual Differences
Static and interactive charts may look different.

Mitigation:
- Shared color and theme definitions

---

## TLDR


- Use Matplotlib for static overview graphs.
- Use uPlot for interactive detailed charts.
- Have Plotly.js as a future alternative, should one be necessary.


---
