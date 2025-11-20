# Unused Code Cleanup Summary

This document lists unused code found and removed from the codebase.

## Removed Code

### Backend (Python)

1. **`similarity_search_with_scores` function** in `backend/rag-api/main.py`
   - **Status**: ✅ Removed
   - **Reason**: Function was defined but never called anywhere in the codebase
   - **Location**: Lines 141-157 (removed)

## Potentially Unused (Not Removed)

### Backend Files

1. **`backend/rag-api/firebase_utils.py`**
   - **Status**: ⚠️ Not imported anywhere
   - **Reason**: May be used in notebooks (`RAG_fun.ipynb`) or for future functionality
   - **Recommendation**: Keep for now, but consider removing if not needed

### Frontend Dependencies (package.json)

The following npm packages are installed but not directly imported in the code:

1. **`react-router-dom`** (v7.7.0)
   - Not imported or used anywhere
   - **Recommendation**: Remove if routing is not needed: `npm uninstall react-router-dom`

2. **`animejs`** (v4.2.2)
   - Not imported or used anywhere
   - **Recommendation**: Remove if animations are not needed: `npm uninstall animejs`

3. **`@testing-library/*`** packages
   - Testing dependencies, may be used for future tests
   - **Recommendation**: Keep if you plan to write tests

4. **`web-vitals`** (v2.1.4)
   - Not imported anywhere
   - **Recommendation**: Remove if not needed: `npm uninstall web-vitals`

### Unused Image Files

The following image files exist in `src/` but are not referenced in the code:

1. `src/DitL_Logo.png`
2. `src/pexels-krisof-1252890.jpg`
3. `src/sparkle_emoji.png`
4. `src/KURIO_name_and_Logo.png`
5. `src/KURIO_name_separate_Logo_black.png`
6. `src/KURIO_name_separate_Logo.png`

**Recommendation**: Review these files and remove if not needed, or add them to `.gitignore` if they're legacy files.

## Verification

All active code paths have been verified:
- ✅ All imports in `main.py` are used
- ✅ All functions in `main.py` are called (except removed ones)
- ✅ All React components are imported and used
- ✅ All API endpoints are functional

## Next Steps (Optional)

If you want to further clean up:

1. **Remove unused npm packages:**
   ```bash
   npm uninstall react-router-dom animejs web-vitals
   ```

2. **Review and remove unused image files** from `src/` directory

3. **Consider removing `firebase_utils.py`** if it's not used in notebooks or future plans

