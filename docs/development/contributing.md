# Contributing to Documentation

## Overview

This guide explains how to update and maintain BukinPoint documentation when adding or modifying features.

## Documentation Structure

Documentation is organized in `docs/`:
- `features/` - Feature documentation
- `flows/` - Process flow documentation
- `technical/` - Technical implementation details
- `guides/` - User guides
- `development/` - Development documentation

## When to Update Documentation

### Adding a New Feature
1. Create feature document in `docs/features/`
2. Create flow document if complex process
3. Update technical docs if needed
4. Update user guides if user-facing
5. Update `docs/README.md` if structure changes

### Modifying Existing Feature
1. Update relevant feature document
2. Update flow document if process changes
3. Update technical docs if implementation changes
4. Add changelog entry with date

### Fixing Bugs
1. Update relevant documentation if behavior changes
2. Document edge cases if discovered
3. Update error handling sections

## Documentation Standards

### File Structure
Each document should follow this structure:
1. **Overview** - Brief description
2. **User Stories** - User perspective
3. **Flow Diagram** - Visual representation (if applicable)
4. **Implementation Details** - Technical details
5. **User Interface** - UI/UX details
6. **Edge Cases** - Error scenarios
7. **Related Features** - Cross-references
8. **Changelog** - Update history

### Writing Style
- Clear and concise
- Use code blocks for code examples
- Use Mermaid diagrams for flows
- Link to related documentation
- Keep examples up to date

### Changelog Format
```markdown
## Changelog

- **YYYY-MM-DD** - Description of change
- **YYYY-MM-DD** - Another change
```

## Updating Checklist

When adding/modifying features:

- [ ] Feature document created/updated
- [ ] Flow document created/updated (if applicable)
- [ ] Technical docs updated (if implementation changes)
- [ ] User guides updated (if user-facing)
- [ ] Changelog entries added
- [ ] Cross-references updated
- [ ] `docs/README.md` updated (if needed)

## Code Examples

### Server Actions
```typescript
// Document function signature
export async function functionName(data: InputType) {
  // Document behavior
}
```

### Components
```tsx
// Document props and behavior
export function ComponentName({ prop1, prop2 }: Props) {
  // Document functionality
}
```

## Diagrams

Use Mermaid for flow diagrams:
- Sequence diagrams for processes
- Flowcharts for decision flows
- State diagrams for state machines

## Review Process

1. Update documentation alongside code changes
2. Review for accuracy and completeness
3. Check cross-references
4. Update changelog
5. Submit with PR

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System overview
- [Testing](./testing.md) - Testing documentation

## Changelog

- **2025-01-10** - Initial contributing guide
