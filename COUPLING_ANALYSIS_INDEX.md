# Coupling Analysis Index

This folder contains a complete analysis of coupling issues between the core reader engine and the outer app's DOM/UI layer.

## Documents

### 1. COUPLING_ANALYSIS.md (281 lines)
**The comprehensive technical analysis**

Start here for a detailed breakdown of all coupling issues.

Contents:
- Executive summary with 38+ issues identified
- 6 major coupling categories with line references
- Severity ratings (HIGH/MEDIUM)
- Dependency breakdown by service
- Architecture violation documentation
- Summary hotspots table

When to read: You want detailed information about specific coupling points and their locations in the code.

### 2. COUPLING_QUICK_REFERENCE.md (206 lines)
**Quick lookup and navigation guide**

Start here if you need quick answers or quick navigation.

Contents:
- Issues organized by severity (26 HIGH, 15 MEDIUM)
- Issues organized by architectural layer
- Complete dependency graph
- 3-phase refactoring roadmap with effort estimates
- Testing improvement analysis
- Files affected by refactoring

When to read: You need quick answers, want to prioritize work, or need the dependency graph.

### 3. REMEDIATION_EXAMPLES.md (532 lines)
**Code examples showing how to fix the issues**

Start here to understand the implementation patterns.

Contents:
- 6 detailed before/after code examples
- Line numbers and file references for each issue
- Pattern explanations (4 key patterns)
- Ready-to-implement solutions
- Clear consumer/provider separation

When to read: You're ready to start implementing fixes or want to understand the refactoring approach.

---

## Quick Navigation by Issue Type

### I have a HIGH severity issue, what do I do?
1. Find it in COUPLING_ANALYSIS.md section 1, 2, or 3
2. Look up the remediation pattern in REMEDIATION_EXAMPLES.md
3. Check the refactoring roadmap in COUPLING_QUICK_REFERENCE.md
4. Implement using the before/after code examples

### I want to understand the full impact
1. Read COUPLING_ANALYSIS.md for detailed analysis
2. Review COUPLING_QUICK_REFERENCE.md dependency graph
3. Check the "Files Affected" section in QUICK_REFERENCE.md

### I'm starting the refactoring
1. Start with COUPLING_QUICK_REFERENCE.md Phase 1
2. Use REMEDIATION_EXAMPLES.md for each issue
3. Verify with the testing improvements section

### I want a high-level overview
1. Read the Executive Summary in COUPLING_ANALYSIS.md
2. Skim the "By Severity" section in COUPLING_QUICK_REFERENCE.md
3. Review REMEDIATION_EXAMPLES.md summary of patterns

---

## Key Findings at a Glance

| Metric | Count | Severity |
|--------|-------|----------|
| HIGH severity issues | 26+ | MUST FIX |
| MEDIUM severity issues | 15+ | IMPROVE |
| Total coupling points | 38+ | N/A |
| DOM queries in EPUBService | 13 | HIGH |
| DOM queries in app.js | 50+ | HIGH |
| Hard-coded element IDs | 50+ | HIGH |
| Internal properties exposed | 6 | HIGH |
| Files with issues | 5 | N/A |

---

## The 5 Core Problem Areas

### 1. EPUBService.js (13 HIGH issues)
**Problem**: Acts as both content service AND UI controller
**Example**: Updates `#book-title`, `#chapters-list`, `#chapter-nav-bar`
**Solution**: Emit events, let app.js handle DOM updates
**Effort**: 3-4 hours
**Doc Reference**: COUPLING_ANALYSIS.md section 1.1, REMEDIATION_EXAMPLES.md #1 & #2

### 2. FontService.js (2 HIGH issues)
**Problem**: Directly appends styles to `document.head`
**Example**: `document.head.appendChild(style)`
**Solution**: Return CSS content, let app.js inject
**Effort**: 1-2 hours
**Doc Reference**: COUPLING_ANALYSIS.md section 1.2, REMEDIATION_EXAMPLES.md #3

### 3. ThemeService.js (4 HIGH issues)
**Problem**: Hard-coded class name queries
**Example**: `querySelector('.ebook-reader-root')`
**Solution**: Accept elements as constructor parameters
**Effort**: 1-2 hours
**Doc Reference**: COUPLING_ANALYSIS.md section 1.3, REMEDIATION_EXAMPLES.md #4

### 4. app.js (11+ HIGH issues)
**Problem**: Accesses internal properties (app.state, app.reader)
**Example**: `app.state.get()`, `app.reader.updateLayout()`
**Solution**: Use public API methods only
**Effort**: 2-3 hours
**Doc Reference**: COUPLING_ANALYSIS.md section 2, REMEDIATION_EXAMPLES.md #5

### 5. CheetahReaderApp.js (2 MEDIUM issues)
**Problem**: Exposes internal properties as public
**Example**: `.state`, `.reader`, `.container`, `.el`
**Solution**: Create public getter/setter methods
**Effort**: 1 hour
**Doc Reference**: COUPLING_ANALYSIS.md section 3.1, COUPLING_QUICK_REFERENCE.md Phase 2

---

## Refactoring Patterns

Four key patterns to implement:

```
Pattern 1: DOM Queries → Events
  Before: service.querySelector() → update DOM
  After:  service.emit('event', data) → app.js listens

Pattern 2: Direct Injection → Constructor Parameters
  Before: this.container.querySelector('.class-name')
  After:  this.elements.targetElement (passed in)

Pattern 3: Internal Access → Public API
  Before: app.state.get('value')
  After:  app.getValue()

Pattern 4: Direct Injection → Return Values
  Before: document.head.appendChild(style)
  After:  return { css } and let caller inject
```

See REMEDIATION_EXAMPLES.md for detailed code examples.

---

## Reading Path by Role

### Developer implementing fixes
1. COUPLING_QUICK_REFERENCE.md (overview and roadmap)
2. REMEDIATION_EXAMPLES.md (code examples for each issue)
3. COUPLING_ANALYSIS.md (reference when stuck)

### Architect reviewing the code
1. COUPLING_ANALYSIS.md (full analysis)
2. COUPLING_QUICK_REFERENCE.md (dependency graph)
3. REMEDIATION_EXAMPLES.md (validation of approach)

### Project manager planning refactoring
1. COUPLING_QUICK_REFERENCE.md (effort estimates and phases)
2. COUPLING_ANALYSIS.md (impact assessment)
3. REMEDIATION_EXAMPLES.md (complexity validation)

### QA testing after refactoring
1. COUPLING_QUICK_REFERENCE.md (files affected section)
2. COUPLING_ANALYSIS.md (what should change)
3. REMEDIATION_EXAMPLES.md (what was fixed)

---

## Questions & Answers

### Q: Where is the main DOM coupling?
A: **EPUBService.js** has the most (13 HIGH severity issues). See COUPLING_ANALYSIS.md section 1.1.

### Q: What's the biggest architectural problem?
A: **Services directly manipulate outer app DOM** instead of emitting events. See section 6 in COUPLING_ANALYSIS.md.

### Q: How long will refactoring take?
A: **20-25 hours total** (Phase 1: 8-10h, Phase 2: 4-5h, Phase 3: 3-4h, Testing: 4-5h). See COUPLING_QUICK_REFERENCE.md.

### Q: Can I refactor in phases?
A: **Yes, 3 phases recommended**. Phase 1 (critical) is 1-2 weeks. See COUPLING_QUICK_REFERENCE.md.

### Q: Will refactoring break functionality?
A: **No, the refactoring is structure-only**. Core logic stays the same. See REMEDIATION_EXAMPLES.md.

### Q: Where do I start?
A: Start with Phase 1 (EPUBService, FontService, ThemeService). See COUPLING_QUICK_REFERENCE.md.

### Q: What's the impact on testing?
A: **Services become unit-testable**. After refactoring, you can write unit tests. See COUPLING_QUICK_REFERENCE.md testing section.

---

## File Organization

```
eBook-Reader/
├── COUPLING_ANALYSIS_INDEX.md      (This file - navigation guide)
├── COUPLING_ANALYSIS.md            (281 lines - detailed analysis)
├── COUPLING_QUICK_REFERENCE.md     (206 lines - quick reference)
├── REMEDIATION_EXAMPLES.md         (532 lines - code examples)
│
├── EPUBService.js                  (13 HIGH severity issues)
├── FontService.js                  (2 HIGH severity issues)
├── ThemeService.js                 (4 HIGH severity issues)
├── app.js                          (11+ HIGH severity issues)
├── CheetahReaderApp.js             (2 MEDIUM severity issues)
│
├── Renderer.js                     (4 MEDIUM severity issues)
├── ebook-reader-api.js             (mostly clean)
├── ebook-reader-engine.js          (mostly clean)
└── ebook-reader-core.js            (clean)
```

---

## Summary

You have **38+ coupling issues** to fix for a clean architecture. The analysis is organized into **3 documents**:

1. **COUPLING_ANALYSIS.md** - Full technical details (start for comprehensive understanding)
2. **COUPLING_QUICK_REFERENCE.md** - Quick navigation and planning (start for quick answers)
3. **REMEDIATION_EXAMPLES.md** - Implementation patterns (start for code examples)

**Total refactoring effort: 20-25 hours across 3 phases**

Begin with Phase 1 (critical) focusing on EPUBService, FontService, and ThemeService.

---

*Analysis completed: October 31, 2025*
*Generated with comprehensive code review and pattern analysis*

