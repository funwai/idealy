# Category Thumbnails System

## Overview
This system maps prompts to category thumbnails by using a separate `category_thumbnails` collection instead of storing `image_url` directly in each prompt document.

## How It Works

### 1. Data Structure

#### `category_thumbnails` Collection
Each document contains:
- `mapped_category`: The category name (e.g., "Tech", "Health", "Education")
- `image_url`: The image URL or path for that category

#### `prompts` Collection
Each document contains:
- `category`: The category name (e.g., "Tech", "Health", "Education")
- `job_title`: The job title
- `typical_day`: Description of a typical day
- `createdAt`: Timestamp
- `source`: Optional source URL

### 2. Mapping Process

1. **Fetch Category Thumbnails**: The system first fetches all documents from `category_thumbnails`
2. **Create Mapping**: Creates a map where `mapped_category` → `image_url`
3. **Display Prompts**: When displaying prompts, looks up the thumbnail using `prompt.category` as the key

### 3. Benefits

- **Consistency**: All prompts in the same category share the same thumbnail
- **Maintainability**: Easy to update category thumbnails in one place
- **Performance**: No need to store duplicate image URLs across multiple prompt documents
- **Flexibility**: Can easily change category thumbnails without updating individual prompts

### 4. Example

```javascript
// category_thumbnails collection
{
  "mapped_category": "Tech",
  "image_url": "tech_thumbnail.jpg"
}

// prompts collection
{
  "category": "Tech",
  "job_title": "Software Engineer",
  "typical_day": "Coding, meetings, debugging..."
}

// Result: The Tech category thumbnail will be displayed for this prompt
```

### 5. Image URL Processing

The system automatically handles different image URL formats:
- Full HTTP URLs (returned as-is)
- Google Cloud Storage gs:// URLs (converted to HTTP download URLs)
- Filenames (constructed into full Firebase Storage URLs)

### 6. Fallback Handling

- If a category has no matching thumbnail, no image is displayed
- If an image fails to load, it's hidden and an error is logged
- Uncategorized prompts show "Uncategorized" in the category field

## Implementation Details

The mapping is implemented in `src/components/PromptResults.js`:
- Uses React `useEffect` hooks to fetch data
- Creates a real-time mapping between categories and thumbnails
- Processes image URLs to ensure proper formatting
- Provides comprehensive logging for debugging
