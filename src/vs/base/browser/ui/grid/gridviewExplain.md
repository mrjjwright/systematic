# GridView: VSCode's Layout Engine

GridView powers VSCode's flexible workspace layout, allowing editors and panels to resize, split, and maximize.

## Core Architecture

| Component | Role | Example |
|-----------|------|---------|
| GridView | Layout engine | Main workbench layout |
| BranchNode | Space divider | Editor group container |
| LeafNode | Content holder | Individual editor |
| SplitView | Resize manager | Sash between editors |

## Key Mechanics

1. Binary Tree Structure
   - Each split creates 2 child nodes
   - Orientation alternates by level (H→V→H)
   - Maintains proportional sizing

2. View Management
   | Operation | Use Case |
   |-----------|----------|
   | addView | Open new editor |
   | removeView | Close editor |
   | maximizeView | Full-screen editor |
   | swapViews | Drag and drop reorder |

## Integration Points

- Workbench: Uses GridView for overall layout
- Editor Groups: Each group is a LeafNode
- Panels: Side/bottom panels connect via boundary sashes
- Sash: Provides resize UI with snapping support

## Visual Structure
