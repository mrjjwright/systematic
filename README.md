# Transformer: A Visual Programming Environment for Content Transformation

## Context and Challenge

You are tasked with designing a sophisticated contribution to VS Code that reimagines the workbench to create a visual programming environment for content transformation. This system will enable semi-technical users to create, visualize, and manage AI-powered workflows across their content using native VS Code components and patterns.

## Core Architecture Requirements

### 1. Native VS Code Integration

- Leverage VS Code's core classes and services:
  - TreeView for hierarchical data representation
  - GridView for layout management
  - Contribution model for extensibility
  - ContextKeyService for state management
  - Monaco editor for rendering
  - NO external web views or non-native components

### 2. Workbench Layout Transformation

Replicate the standard VS Code workbench layout in another layout for Transformer that can be used as follows:

- Left: Retain the Explorer view/Activity Bar with modifications
- Center: Replace editor area with a grid of TreeViews
- Right: Dedicated chat/interaction panel
- Bottom: Detail view panel for content preview, essentially a detail editor that responds to what is chosen in a tree view

### 3. Visual Programming Core

Design a system of interconnected TreeViews where:

- Each TreeView represents a transformation step, e.g. concatenating 2 or more files from the tree view before
- Nodes can be connected across TreeViews to create workflows but not by creating lines, some other way of making the connection should be designed
- an example of a way to connect nodes would be to select a node in a tree and then push the "=" key, or the "@" key or perhaps different ways of activating a mode of connection, at that point the interface might respond different as the user navigates around, perhaps a different selection or hover color. When the user pushes enter or otherwise uses mouse to select another node, then the tree view would show as being linked with a special reference and rendering of that node that could be jumped to.
- trees would mix content from files, simple JSON values, nodes are identified by their content not by any name. Except some nodes are names because they are folders that hold content so we can still name things so that trees can have named parameters in a way

## Key Design Challenges

1. **State Management**

- Leverage ContextKeyService for managing complex workflow states
- Design a clean state management architecture that can handle:
  - Node selection states
  - Connection states
  - Transformation progress
  - Validation states

4. **TreeView Grid Layout**

- Design an efficient grid layout system for multiple TreeViews
- Consider dynamic resizing and reordering
- Handle overflow and navigation in complex workflows

## Implementation Considerations

### Core VS Code Classes to Leverage

1. **Workbench**

- IWorkbenchLayoutService
- IViewsService
- IEditorService

2. **Views and Panels**

- TreeView
- GridView
- ViewContainer
- IView
- IPanelService

3. **Context and State**

- IContextKeyService
- IContextMenuService
- ICommandService

4. **Events and Updates**

- Event handling system
- Custom events for transformation updates
- Progress indication

### Extension Points

1. **View Containers**

- Main transformation grid container
- Chat panel container
- Detail view container

2. **Commands and Menus**

- Node connection commands
- Transformation execution commands
- Context menu contributions

3. **Configuration**

- Layout preferences
- Transformation settings
- Visual styling options

## Design Principles

1. **Native First**

- Use VS Code's native UI components
- Follow VS Code's interaction patterns
- Maintain consistent styling

2. **Functional Transformation**

- Each transformation step should be pure and isolated
- Clear input/output contracts
- Composable operations

3. **Visual Clarity**

- Clear visual hierarchy
- Intuitive node connections
- Progressive disclosure of complexity

4. **Performance**

- Efficient rendering of multiple TreeViews
- Smooth interaction with large datasets
- Responsive transformation execution

## Expected Capabilities

The system should enable users to:

1. Create and manage transformation workflows visually
2. Connect nodes across different TreeViews
3. Preview transformation results in real-time
4. Save and load workflow configurations
5. Share workflows with team members
6. Debug and monitor transformation progress
7. Extend the system with custom transformations

## Technical Constraints

1. Must use VS Code's native component model
2. No external web views or frameworks
3. Must integrate with VS Code's theming system
4. Must support VS Code's extension lifecycle
5. Must maintain VS Code's performance standards

Consider this a foundation for reimagining VS Code's workbench while maintaining its core strengths and extending them in new directions. The goal is to create a powerful yet intuitive visual programming environment that feels native to VS Code while enabling new workflows for semi-technical users.

Even if you can't design the actual working product, ideas on how this could work are appreciated as well.
