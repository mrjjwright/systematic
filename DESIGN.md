
# VSCode-Native Transformation System Design

## Core Principle

Build a transformation system that works with VSCode's native patterns and infrastructure rather than creating custom UI components. This approach leverages VSCode's mature, well-tested interfaces while providing a powerful way to connect and transform content.

## Key Components

### Nodes

A Node is both a TreeItem and potentially a TreeView:

- Appears as an item in a tree
- Can expand to show its internal structure
- Has inputs and outputs as child nodes
- Contains transformation logic
- Can be linked to other nodes

### Links

Links are references between nodes, created through a VSCode-native linking mode:

1. Right-click a node and select "Link" or use hotkey
2. VSCode enters linking mode (controlled by ContextKey)
3. Select target node(s)
4. Press Enter to complete link

### Visualization

Instead of custom visualization surfaces, use styled TreeViews to show relationships:

```
└─ Transform: Concatenate
   ├─ Inputs
   │  ├─ file1.txt
   │  └─ file2.txt
   └─ Output
      └─ result.txt
```

### Execution

Use VSCode's debug infrastructure for running transformations:

- Transformations are like debug configurations
- Steps are visible and inspectable
- State is shown in variables panel
- Output appears in native panels
- Problems surface in problems panel

## Example: File Concatenation

Creating a simple concatenation workflow:

1. Command Palette: "Create Transformer"
2. Quick Pick: Select "Concatenate"
3. New node appears in Transformer view
4. Link inputs through context menu
5. Configure output location
6. Run transformation using debug infrastructure

The node appears as:

```
└─ Concatenate
   ├─ Inputs
   │  ├─ Input 1 → file1.txt
   │  └─ Input 2 → file2.txt
   └─ Output
      └─ (concatenated result)
```

## Benefits

1. **Native Feel**: Uses interfaces users already know
2. **Reliability**: Builds on tested VSCode components
3. **Performance**: Avoids custom UI overhead
4. **Extensibility**: Works with VSCode's extension system
5. **Familiarity**: Leverages existing user knowledge

## Technical Integration

Nodes integrate with VSCode through standard interfaces:

```typescript
interface TransformerNode {
  // TreeItem functionality
  id: string;
  label: string;
  collapsibleState: TreeItemCollapsibleState;

  // Node functionality
  inputs: TreeItem[];
  outputs: TreeItem[];
  transform(): Promise<void>;

  // Optional TreeView for internal structure
  view?: TreeView<TreeItem>;
}
```

Configuration is stored in `.transformer/` directory, similar to `.vscode/`:

```json
{
  "transforms": {
    "concatenate-example": {
      "type": "concatenate",
      "inputs": ["file1.txt", "file2.txt"],
      "output": "result.txt"
    }
  }
}
```

## Future Extensions

This design can be extended to support:

1. Complex workflows
2. AI-powered transformations
3. Real-time updates
4. Collaborative editing
5. Version control integration

All while maintaining VSCode's native feel and performance characteristics.
