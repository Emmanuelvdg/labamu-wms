# Floor Plan Feature - User Guide

## Overview

The Warehouse Floor Plan feature is an interactive visual layout designer that helps you plan and organize your warehouse functional areas with meter-based precision.

## Accessing the Floor Plan

1. Navigate to **Settings → Warehouses**
2. Click on any warehouse
3. Select the **Floor Plan** tab
4. The floor plan editor will load with your warehouse's current layout

## Key Features

### 1. **Meter-Based Grid**
- 1m × 1m grid squares represent real-world dimensions
- Major gridlines every 5m, minor gridlines every 1m
- Toggle grid visibility on/off

### 2. **Warehouse Boundaries**
- Supports multiple warehouse shapes:
  - **Rectangle** (default): Standard warehouse shape
  - **L-Shape**: For angular warehouses
  - **U-Shape**: For U-shaped facilities
  - **Custom**: Draw any polygon shape

- Default size: 50m × 30m (customizable)

### 3. **Functional Areas**
- Automatically created based on your warehouse workflow configuration
- Color-coded by type (Receiving, Storage, Shipping, etc.)
- Displayed with real dimensions (e.g., "5.3m × 4.1m")

### 4. **Interactive Editing**

#### Drag & Drop
- Drag areas from the left palette onto the canvas
- Drop anywhere on the floor plan
- Automatic snap-to-grid (toggleable)

#### Resize Areas
1. Click any area to select it
2. Blue circle handles appear at:
   - **4 corners** (NW, NE, SE, SW)
   - **4 edges** (N, S, E, W)
3. Drag any handle to resize
4. **Hold Shift** while dragging for proportional resizing
5. Release to auto-save to database

#### Area Controls
- **Rotate**: 90° rotation button
- **Delete**: Remove area from floor plan
- **Move**: Drag the area itself to reposition

### 5. **Zoom & Pan**
- Zoom levels: 50% to 200%
- Use zoom controls in the toolbar
- Perfect for detailed layout work

## How to Use

### Initial Setup
1. Create a warehouse with your preferred workflow configuration (1-step, 2-step, or 3-step)
2. System automatically creates functional areas
3. Open Floor Plan to see the initial layout

### Designing Your Layout
1. **View Areas**: See all functional areas on the grid
2. **Position Areas**: Drag areas to optimal locations
3. **Size Areas**: Click and resize using drag handles
4. **Optimize Flow**: Arrange areas to match operational workflow
   - Receiving → Staging → Storage → Picking → Packing → Shipping
5. **Save**: Changes auto-save as you work

### Best Practices

**Design Principles:**
- Place frequently accessed areas closer to primary paths
- Size storage areas based on expected inventory volume
- Leave adequate pathways between areas (minimum 2-3m)
- Position Receiving near entry points
- Position Shipping near loading docks

**Using the Grid:**
- **Enable Snap**: For quick, aligned placement
- **Disable Snap**: For fine-tuning exact positions
- **Grid Toggle**: Turn off for cleaner visual while planning

**Resizing Tips:**
- Use **corner handles** for two-dimensional resizing
- Use **edge handles** (N, S, E, W) for single-dimension adjustments
- Hold **Shift** for maintaining aspect ratio
- Dimensions update in real-time

## Keyboard Shortcuts

- **Click**: Select area
- **Drag**: Move area or resize handle
- **Shift + Drag**: Resize proportionally
- **Delete** (when selected): Remove area

## Common Workflows

### Reorganizing a Warehouse
1. Open existing warehouse floor plan
2. Click and drag areas to new positions
3. Resize as needed
4. Verify all areas fit within boundary
5. Changes save automatically

### Setting Up a New Warehouse
1. Create warehouse with workflow steps
2. Open floor plan (areas pre-created)
3. Resize default 5m × 5m areas to actual sizes
4. Position according to physical layout
5. Add custom areas if needed (drag from palette)

## Advanced Features (Coming Soon)

### Distance Measurements
- View center-to-center distances between areas
- Optimize travel paths
- Identify bottlenecks

### Collision Detection
- Visual warnings when areas overlap
- Red outlines for boundary violations
- Prevent layout errors

### Shape Editor
- Draw custom warehouse boundaries
- Edit vertices by dragging
- Support complex polygon shapes

### Export
- Save floor plan as PNG image
- Export as PDF for documentation
- Print-friendly layouts

## Technical Details

- **Unit**: All measurements in meters
- **Precision**: 1 decimal place (e.g., 5.3m)
- **Grid Size**: 1m (configurable)
- **Default Area Size**: 5m × 5m
- **Minimum Area Size**: 1m × 1m
- **Zoom Range**: 50% - 200%

## Troubleshooting

**Areas not showing?**
- Verify warehouse has workflow configuration set
- Check that functional areas were created
- Refresh the page

**Can't resize areas?**
- Click the area first to select it
- Look for blue circle handles
- Ensure you're not in view-only mode

**Snap not working?**
- Check "Snap to Grid" toggle is ON
- Grid must be enabled
- Verify grid size is set (default: 1m)

**Changes not saving?**
- Check network connection
- Verify you have write permissions
- Look for error toast notifications

##FAQ

**Q: Can I change the warehouse dimensions?**
A: Not yet in the UI. Default is 50m × 30m. Future updates will allow custom dimensions.

**Q: Can I create custom functional areas?**
A: Yes! Drag from the palette, or areas with custom workflows will appear automatically.

**Q: What happens if I delete an area?**
A: The functional area is removed from the floor plan but the linked location still exists in the location hierarchy.

**Q: Can I undo changes?**
A: Undo/Redo feature is planned for a future update. Currently, manually revert changes.

**Q: Does the floor plan affect picking/putaway?**
A: Currently, the floor plan is for visualization and planning. Future updates will integrate with distance calculations for route optimization.

## Support

For issues or feature requests related to the floor plan:
1. Check this guide first
2. Review the system architecture documentation
3. Contact your system administrator

---

**Last Updated**: December 29, 2024  
**Version**: 2.0 (Enhanced Interactive Floor Plan)
