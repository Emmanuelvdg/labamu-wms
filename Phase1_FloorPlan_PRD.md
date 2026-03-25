# Phase 1 PRD – Finalising Floor‑Plan Module and Linking to Operations

## 1 Purpose
This product requirement document (PRD) defines the scope, goals and functional details for Phase 1 of the Labamu WMS enhancement roadmap. The objective of this phase is to finish the interactive floor‑plan editor and link it to operational processes so that warehouse layouts are not only visual but also drive routing and location logic. Additionally, it introduces import/export utilities to simplify adoption and migration.

## 2 Background
The current WMS includes an interactive, metre‑based floor‑plan editor where users can place and resize functional areas on a grid. However, the user guide lists several advanced features as coming soon, such as distance measurements, collision detection, a shape editor and export functionality. The editor also does not yet affect picking or put‑away logic; it is purely for visualization. Completing these features and binding the floor plan to actual locations will unlock value: it will enable route optimisation, travel‑time metrics and better space utilisation.

## 3 Goals & Success Metrics
- **Finish interactive editing features** – Implement distance‑measurement, collision detection, shape editing, export, custom dimensions and an undo/redo stack in the floor‑plan editor.
- **Operational linkage** – Associate each functional area on the floor plan with real location codes and incorporate distance calculations into route planning. Picking and put‑away rules should be able to reference coordinates.
- **Data portability** – Provide import/export utilities (CSV/Excel) for floor plans and location hierarchies so users can migrate or back up their layouts.
- **User adoption** – Ensure the new features are intuitive and do not slow down existing workflows. Measure success by increased usage of floor‑plan features and reduced time to configure a warehouse layout.

## 4 Scope

### In scope
- **Distance measurement tool** – Display centre‑to‑centre distances between areas and update in real time as users move or resize areas. Provide total travel distance for a sequence of areas.
- **Collision detection and prevention** – Highlight overlapping areas with visual warnings and prevent saving a floor plan that contains collisions.
- **Shape editor and custom dimensions** – Allow users to draw custom warehouse boundaries (rectangular, U‑shaped, L‑shaped, or custom polygon), edit vertices and define custom width/height. Users can also set floor‑plan dimensions in metres from the UI.
- **Export functionality** – Enable exporting floor plans as PNG/PDF for documentation or printing.
- **Undo/redo stack** – Provide undo and redo buttons to revert or reapply the last N actions (adding, moving, resizing, deleting areas).
- **Link areas to locations** – Each functional area must be linked to one or more location codes in the warehouse hierarchy. If a user drags a location onto the floor plan, the system creates or updates the link.
- **Coordinate metadata** – Store X/Y coordinates and dimensions for each area in the database; update them when areas change.
- **Routing integration** – Use the stored coordinates to compute shortest paths between pick or put‑away tasks. Expose a distance API for the routing engine. The current floor plan will start influencing the task sequencing logic.
- **Import/export utilities** – Implement UI and backend endpoints to upload/download CSV or Excel files for floor‑plan configurations and location hierarchies.
- **Documentation and user guide updates** – Update documentation and user guides to reflect new features and include tutorials.

### Out of scope
- 3‑D visualization or digital twin
- AI‑driven slotting or advanced picking strategies
- Mobile application
- Workflow engine (Multi‑step workflows are handled separately).

## 5 Assumptions
- The existing database can be extended to store additional floor‑plan metadata (custom shapes, vertices) without breaking other modules.
- All measurements are stored in metres with 1 decimal precision.
- The coordinate system origin (0,0) is configurable. Administrators can choose the reference point to match the physical warehouse layout.
- Users have permission to import/export layouts and update locations as part of the existing RBAC system.
- The routing engine and picking/put‑away modules will accept distance inputs and can be extended to use them.

## 6 Functional Requirements

### 6.1 Distance Measurement Tool
- Provide a toggle to enable distance measurement mode. When enabled, hovering over two areas shows the horizontal, vertical and straight‑line distance in metres.
- Allow users to select multiple areas to compute aggregate path distance (sum of straight‑line distances in sequence).
- Update distances dynamically as areas move or resize.

### 6.2 Collision Detection
- Detect overlapping bounding boxes between functional areas. When a collision occurs, display a red outline and an error tooltip.
- Prevent saving a floor plan with overlapping areas and provide guidance to resolve overlaps.

### 6.3 Shape Editor & Custom Dimensions
- Provide predefined shapes (rectangle, U‑shaped, L‑shaped) and a “custom polygon” option. For custom polygons, users can add, move or delete vertices.
- Allow users to input custom dimensions (width and height) in metres. The grid and view scale accordingly.
- Validate that the drawn shape does not self‑intersect and that all functional areas reside within the boundary.

### 6.4 Export Functionality
- Add an “Export” button that generates a PNG or PDF of the current floor plan. The export should include a scale, legend and timestamp.
- Provide options to export the floor‑plan data (areas, coordinates, sizes, linked locations) as CSV.

### 6.5 Undo/Redo Stack
- Track user actions (add, delete, move, resize, link/unlink location) in a stack with a configurable history length. Default is 10 actions.
- Provide “Undo” and “Redo” buttons in the UI. Disabled when no actions are available.
- Ensure undoing an action also reverts any location links and distance calculations.

### 6.6 Linking Areas to Locations
- When creating or editing an area, the user can select a location code from a searchable list or drag an existing location from the hierarchy onto the floor plan. 
- The system supports linking a functional area to multiple location codes.
- Persist the linkage in the database so that location records store their X/Y coordinates and area ID.
- Prevent deletion of an area if linked locations would be orphaned.

### 6.7 Routing Integration
- Expose a service that returns the straight‑line distance between two locations using their coordinates. Support multi‑stop routes by summing distances.
- Modify put‑away and picking algorithms to accept distance data. Initially, simple nearest‑neighbour logic can prioritise tasks based on distance.
- Store historical travel‑time data (actual vs. straight‑line) to support future analytics.

### 6.8 Import/Export Utilities
- Provide a UI to upload a CSV/Excel file containing floor‑plan data (areas, coordinates, dimensions, linked location codes) and location hierarchies. 
- The system validates and previews changes before applying.
- Provide a download function that exports current floor‑plan configurations and the location tree to CSV/Excel.
- Include error handling and logs for import failures.

## 8 Non‑Functional Requirements
- **Performance** – Distance calculations should occur instantly (<50 ms for two areas). Import/export operations for typical warehouse sizes (<1,000 locations) should complete within 10 seconds.
- **Usability** – The floor‑plan editor must remain intuitive. New tools should use familiar icons and tooltips. Undo/redo should have keyboard shortcuts (Ctrl+Z/Ctrl+Y).
- **Data integrity** – Changes to the floor plan and location links should be transactional; partial failures must roll back. Import validation should prevent corrupt data.
- **Security** – Respect existing RBAC.

## 10 Open Questions (Resolved)
- Coordinate system reference: The origin (0,0) should be configurable. Administrators will set the reference point when configuring each warehouse.
- Multiple location links: The system will support one‑to‑many mappings between functional areas and location codes.
- Export file formats: CSV is the preferred format. PNG/PDF for image outputs.
- History length: Default 10 actions.

## 11 Conclusion
Integrating these features transforms the floor plan from a static drawing into a functional tool driving warehouse efficiency, setting the foundation for advanced analytics and workflow routing.
