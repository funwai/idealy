import React, { useEffect, useState } from 'react';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, INLINES, MARKS } from '@contentful/rich-text-types';
import { fetchEntries } from './contentfulClient';

const tryParseJson = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Could not JSON.parse value from Contentful jsonData:', error);
    return null;
  }
};

const normalizeJsonKeyValue = (data) => {
  if (!data) return null;

  if (Array.isArray(data)) {
    const entries = data.filter(
      (item) => item && typeof item === 'object' && 'key' in item && 'value' in item
    );
    if (entries.length === 0) {
      return null;
    }
    return entries.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  if (typeof data === 'object') {
    return data;
  }

  return tryParseJson(data);
};

const buildTableFromRows = (rows, title) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        Object.keys(row).forEach((key) => set.add(key));
      }
      return set;
    }, new Set())
  );

  if (headers.length === 0) {
    return null;
  }

  return {
    title,
    headers,
    rows,
  };
};

const extractTableData = (data) => {
  const attempt = (value, title) => buildTableFromRows(value, title);

  const inspectEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const entryTitle = entry.title || entry.heading || entry.label || entry.key || '';

    if (Array.isArray(entry.rows)) {
      return attempt(entry.rows, entryTitle);
    }

    if (Array.isArray(entry.data)) {
      return attempt(entry.data, entryTitle);
    }

    if (Array.isArray(entry.value)) {
      return attempt(entry.value, entryTitle);
    }

    return null;
  };

  const traverse = (value) => {
    if (!value) return null;

    if (Array.isArray(value)) {
      for (const item of value) {
        const direct = inspectEntry(item);
        if (direct) return direct;
      }

      const table = attempt(value, '');
      if (table) return table;

      for (const item of value) {
        const nested = traverse(item);
        if (nested) return nested;
      }

      return null;
    }

    if (typeof value === 'object') {
      const direct = inspectEntry(value);
      if (direct) return direct;

      for (const nested of Object.values(value)) {
        const found = traverse(nested);
        if (found) return found;
      }
    }

    return null;
  };

  return traverse(data);
};

// Function to extract PDF URLs from Contentful Rich Text embedded assets
const extractPdfFromRichText = (richTextDocument) => {
  if (!richTextDocument || !richTextDocument.content) return null;
  
  const traverse = (node) => {
    if (!node) return null;
    
    // Check if this is an embedded asset block
    if (node.nodeType === 'embedded-asset-block' || node.nodeType === 'embedded-asset') {
      const asset = node.data?.target || node.data;
      if (asset?.fields?.file?.url) {
        const url = asset.fields.file.url;
        const contentType = asset.fields.file.contentType;
        
        if (contentType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) {
          return url.startsWith('http') ? url : `https:${url}`;
        }
      }
    }
    
    // Recursively check content array
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        const found = traverse(child);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  return traverse(richTextDocument);
};

const findPdfUrlInJson = (data) => {
  const traverse = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Check for direct PDF URLs
      if (trimmed.toLowerCase().endsWith('.pdf')) {
        // Ensure it has a protocol
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return trimmed;
        }
        // If it starts with //, add https:
        if (trimmed.startsWith('//')) {
          return `https:${trimmed}`;
        }
        // If it's a Contentful asset URL pattern
        if (trimmed.includes('contentful.com') || trimmed.includes('ctfassets.net')) {
          return trimmed.startsWith('http') ? trimmed : `https:${trimmed}`;
        }
        return trimmed;
      }
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = traverse(item);
        if (found) return found;
      }
      return null;
    }

    if (typeof value === 'object') {
      // Check for Contentful asset structure
      if (value.fields?.file?.url) {
        const url = value.fields.file.url;
        if (url.toLowerCase().endsWith('.pdf') || value.fields.file.contentType === 'application/pdf') {
          // Contentful asset URL - ensure it has https:
          return url.startsWith('http') ? url : `https:${url}`;
        }
      }
      
      // Check for direct PDF URL in object properties
      if (value.url && typeof value.url === 'string' && value.url.toLowerCase().endsWith('.pdf')) {
        const url = value.url.trim();
        return url.startsWith('http') ? url : `https:${url}`;
      }
      
      if (value.pdfUrl && typeof value.pdfUrl === 'string') {
        const url = value.pdfUrl.trim();
        return url.startsWith('http') ? url : `https:${url}`;
      }
      
      // Recursively search nested objects
      for (const nested of Object.values(value)) {
        const found = traverse(nested);
        if (found) return found;
      }
    }

    return null;
  };

  return traverse(data);
};

const formatCellValue = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Format numbers with thousand separators
  if (typeof value === 'number') {
    return value.toLocaleString('en-US');
  }

  // Handle numeric strings
  if (typeof value === 'string') {
    // Check if the string is purely numeric (possibly with decimals, negative sign)
    const trimmed = value.trim();
    const isPureNumber = /^-?\d+\.?\d*$/.test(trimmed);
    
    if (isPureNumber) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        // Preserve decimal places
        const decimalPlaces = trimmed.includes('.') ? trimmed.split('.')[1].length : 0;
        return num.toLocaleString('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
      }
    }
    
    // Handle strings with currency symbols, percentages, etc.
    // Extract the number part and format it
    const numericMatch = trimmed.match(/(-?\d+\.?\d*)/);
    if (numericMatch && numericMatch.index !== undefined) {
      const numStr = numericMatch[1];
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        const decimalPlaces = numStr.includes('.') ? numStr.split('.')[1].length : 0;
        const formattedNum = num.toLocaleString('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
        // Replace only the first occurrence (the number part)
        return trimmed.replace(numStr, formattedNum);
      }
    }
  }

  return value;
};

const Insights = () => {
  console.log('🎯 Insights component rendering');
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const contentType = process.env.REACT_APP_CONTENTFUL_INSIGHTS_TYPE_ID;

    if (!contentType) {
      setError('Contentful content type is not configured.');
      setLoading(false);
      return;
    }

    const loadInsights = async () => {
      try {
        // Order by system createdAt date (always available) instead of a custom field
        const entries = await fetchEntries({
          content_type: contentType,
          order: ['-sys.createdAt'],
          include: 2,
        });

        const normalized = entries.map((item) => {
          const fields = item.fields || {};

          const title =
            fields.article_title ||
            fields.Title ||
            fields.title ||
            'Untitled Insight';

          const articleBody =
            fields.article_body ||
            fields.article_Body ||
            null;

          const publishedDate =
            fields.articleTimestamp ||
            fields.article_timestamp ||
            item.sys?.createdAt;

          const bibliography =
            fields.bibliography ||
            null;

          const rawJsonData = fields.jsonData ?? fields.json_data ?? null;
          const normalizedJsonData = normalizeJsonKeyValue(rawJsonData);
          const tableData =
            extractTableData(rawJsonData) ||
            extractTableData(normalizedJsonData);
          
          // Check for PDF in multiple places:
          // 1. Search all fields for Contentful asset references
          let pdfUrl = null;
          
          // Function to extract PDF URL from a Contentful asset
          const extractPdfFromAsset = (asset, fieldName = '') => {
            if (!asset) return null;
            
            console.log(`🔍 Checking asset in field "${fieldName}":`, {
              type: typeof asset,
              isObject: typeof asset === 'object',
              hasFields: !!asset.fields,
              hasFile: !!asset.fields?.file,
              hasUrl: !!asset.fields?.file?.url,
              contentType: asset.fields?.file?.contentType,
              sysType: asset.sys?.type,
              sysLinkType: asset.sys?.linkType,
            });
            
            // If it's already a linked asset with fields (fully resolved)
            if (asset.fields?.file?.url) {
              const url = asset.fields.file.url;
              const contentType = asset.fields.file.contentType;
              console.log(`📄 Asset file found - URL: ${url}, ContentType: ${contentType}`);
              
              // Check if it's a PDF by content type or file extension
              if (contentType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) {
                const fullUrl = url.startsWith('http') ? url : `https:${url}`;
                console.log(`✅ PDF URL extracted: ${fullUrl}`);
                return fullUrl;
              }
            }
            
            // If it's a sys reference (not fully resolved), log it
            if (asset.sys?.type === 'Link' && asset.sys?.linkType === 'Asset') {
              console.log(`⚠️ Asset is a sys reference (not resolved):`, asset.sys.id);
            }
            
            // If it has a direct URL property
            if (asset.url && typeof asset.url === 'string' && asset.url.toLowerCase().endsWith('.pdf')) {
              return asset.url.startsWith('http') ? asset.url : `https:${asset.url}`;
            }
            
            return null;
          };
          
          // Search through all fields for asset fields
          console.log('🔎 Searching all fields for PDF assets...');
          for (const [fieldName, fieldValue] of Object.entries(fields)) {
            if (!fieldValue) continue;
            
            console.log(`  Checking field "${fieldName}" (type: ${typeof fieldValue}, isArray: ${Array.isArray(fieldValue)})`);
            
            // Check if this field is an asset
            const assetPdf = extractPdfFromAsset(fieldValue, fieldName);
            if (assetPdf) {
              console.log(`✅ Found PDF in field "${fieldName}":`, assetPdf);
              pdfUrl = assetPdf;
              break;
            }
            
            // Also check if it's an array of assets
            if (Array.isArray(fieldValue)) {
              console.log(`  Field "${fieldName}" is an array with ${fieldValue.length} items`);
              for (let i = 0; i < fieldValue.length; i++) {
                const item = fieldValue[i];
                const assetPdf = extractPdfFromAsset(item, `${fieldName}[${i}]`);
                if (assetPdf) {
                  console.log(`✅ Found PDF in array field "${fieldName}[${i}]":`, assetPdf);
                  pdfUrl = assetPdf;
                  break;
                }
              }
              if (pdfUrl) break;
            }
          }
          
          // 2. Check in article_Body rich text field for embedded assets
          if (!pdfUrl && articleBody) {
            console.log('🔍 Checking article_Body for embedded PDF assets...');
            pdfUrl = extractPdfFromRichText(articleBody);
            if (pdfUrl) {
              console.log('✅ Found PDF embedded in article_Body:', pdfUrl);
            }
          }
          
          // 3. Check in jsonData
          if (!pdfUrl) {
            pdfUrl =
              findPdfUrlInJson(rawJsonData) ||
              findPdfUrlInJson(normalizedJsonData);
          }
          
          // Debug logging
          if (pdfUrl) {
            console.log('✅ PDF URL extracted:', pdfUrl);
          } else {
            console.log('⚠️ No PDF URL found in entry');
            console.log('📋 Available fields:', Object.keys(fields));
            console.log('🔍 Checking field types:', 
              Object.entries(fields).map(([key, val]) => ({
                field: key,
                type: typeof val,
                isObject: typeof val === 'object' && val !== null,
                hasFields: typeof val === 'object' && val?.fields,
                hasFile: typeof val === 'object' && val?.fields?.file,
              }))
            );
            if (rawJsonData) {
              console.log('📦 jsonData structure:', JSON.stringify(rawJsonData, null, 2).substring(0, 500));
            }
          }

          const derivedCategory =
            normalizedJsonData?.category ||
            normalizedJsonData?.topic ||
            '';

          const derivedLink =
            normalizedJsonData?.link ||
            normalizedJsonData?.url ||
            '';

          const derivedHeroImage =
            normalizedJsonData?.heroImage ||
            normalizedJsonData?.image ||
            '';

          return {
            id: item.sys?.id || title,
            title,
            articleBody,
            publishedDate,
            bibliography,
             category: derivedCategory,
             link: derivedLink,
             heroImage: derivedHeroImage,
            jsonData: normalizedJsonData,
            jsonRaw: rawJsonData,
            tableData,
            pdfUrl,
          };
        });

        setInsights(normalized);
      } catch (err) {
        console.error('Failed to load Contentful insights:', err);
        setError(err.message || 'Unable to load insights right now.');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, []);

  const formatDate = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (err) {
      return value;
    }
  };

  // Rich text renderer options
  const richTextOptions = {
    renderNode: {
      [BLOCKS.PARAGRAPH]: (node, children) => <p className="rich-text-paragraph">{children}</p>,
      [BLOCKS.HEADING_1]: (node, children) => <h1 className="rich-text-heading">{children}</h1>,
      [BLOCKS.HEADING_2]: (node, children) => <h2 className="rich-text-heading">{children}</h2>,
      [BLOCKS.HEADING_3]: (node, children) => <h3 className="rich-text-heading">{children}</h3>,
      [BLOCKS.UL_LIST]: (node, children) => <ul className="rich-text-list">{children}</ul>,
      [BLOCKS.OL_LIST]: (node, children) => <ol className="rich-text-list">{children}</ol>,
      [BLOCKS.LIST_ITEM]: (node, children) => <li className="rich-text-list-item">{children}</li>,
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const asset = node.data.target;
        if (!asset?.fields?.file?.url) return null;
        
        const url = asset.fields.file.url;
        const contentType = asset.fields.file.contentType;
        const fullUrl = url.startsWith('http') ? url : `https:${url}`;
        
        // Handle PDF assets
        if (contentType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) {
          return (
            <div className="rich-text-embedded-pdf">
              <iframe
                src={fullUrl}
                type="application/pdf"
                title={asset.fields.title || 'PDF Document'}
                className="rich-text-pdf-iframe"
              />
              <div className="rich-text-pdf-fallback">
                <a href={fullUrl} target="_blank" rel="noreferrer" className="rich-text-pdf-link">
                  📄 Open PDF in new tab
                </a>
              </div>
            </div>
          );
        }
        
        // Handle image assets
        if (contentType?.startsWith('image/')) {
          return (
            <div className="rich-text-embedded-image">
              <img
                src={fullUrl}
                alt={asset.fields.title || asset.fields.description || 'Image'}
                className="rich-text-image"
              />
            </div>
          );
        }
        
        // Fallback for other asset types
        return (
          <div className="rich-text-embedded-asset">
            <a href={fullUrl} target="_blank" rel="noreferrer" className="rich-text-asset-link">
              {asset.fields.title || 'Download file'}
            </a>
          </div>
        );
      },
      [INLINES.HYPERLINK]: (node, children) => (
        <a href={node.data.uri} target="_blank" rel="noreferrer" className="rich-text-link">
          {children}
        </a>
      ),
    },
  };

  const renderRichText = (richTextDocument) => {
    if (!richTextDocument) return null;
    return documentToReactComponents(richTextDocument, richTextOptions);
  };

  return (
    <div className="insights-page">
      <div className="insights-container">
        <header className="insights-header">
          <p className="eyebrow">Latest from the KURIO team</p>
          <h1>Business Insights</h1>
        </header>

        {loading && <div className="insights-status">Loading insights from Contentful...</div>}
        {error && !loading && <div className="insights-status error">{error}</div>}

        {!loading && !error && insights.length === 0 && (
          <div className="insights-status">No insights published yet. Add entries in Contentful to see them here.</div>
        )}

        {!loading && !error && insights.length > 0 && (
          <div className="insights-grid">
            {insights.map((insight) => (
              <article className="insight-card" key={insight.id}>
                {insight.heroImage && (
                  <div className="insight-card-image">
                    <img src={insight.heroImage} alt={insight.title} />
                  </div>
                )}
                <div className="insight-card-body">
                  <div className="insight-card-meta">
                    {insight.category && <span className="insight-category">{insight.category}</span>}
                    {insight.publishedDate && (
                      <span className="insight-date">{formatDate(insight.publishedDate)}</span>
                    )}
                  </div>
                  <h3>{insight.title}</h3>
                  {insight.articleBody && (
                    <div className="insight-summary">
                      {renderRichText(insight.articleBody)}
                    </div>
                  )}
                  {insight.link && (
                    <a
                      href={insight.link}
                      target="_blank"
                      rel="noreferrer"
                      className="insight-link"
                    >
                      Read more →
                    </a>
                  )}
                  {insight.tableData && (() => {
                    // Sort headers so 'Metric' is always first
                    const sortedHeaders = [...insight.tableData.headers].sort((a, b) => {
                      const aIsMetric = a.toLowerCase() === 'metric';
                      const bIsMetric = b.toLowerCase() === 'metric';
                      if (aIsMetric && !bIsMetric) return -1;
                      if (!aIsMetric && bIsMetric) return 1;
                      return 0;
                    });
                    
                    // Helper function to check if a value is negative
                    const isNegative = (value) => {
                      if (value === null || value === undefined) return false;
                      const num = typeof value === 'string' ? parseFloat(value.replace(/[,$%]/g, '')) : Number(value);
                      return !isNaN(num) && num < 0;
                    };
                    
                    // Helper function to check if a value is a number
                    const isNumeric = (value, header) => {
                      // Don't right-align the Metric column
                      if (header.toLowerCase() === 'metric') return false;
                      if (value === null || value === undefined) return false;
                      // Check if it's already a number
                      if (typeof value === 'number') return true;
                      // Check if it's a numeric string (handles currency, percentages, etc.)
                      if (typeof value === 'string') {
                        const cleaned = value.replace(/[,$%()\s]/g, '');
                        return !isNaN(cleaned) && cleaned !== '';
                      }
                      return false;
                    };
                    
                    return (
                      <div className="insight-table">
                        {insight.tableData.title && (
                          <h4 className="insight-table-title">{insight.tableData.title}</h4>
                        )}
                        <div className="insight-table-wrapper">
                          <table>
                            <thead>
                              <tr>
                                {sortedHeaders.map((header) => {
                                  // Check if this column contains numbers (check first row as sample)
                                  const firstRowValue = insight.tableData.rows[0]?.[header];
                                  const isNumericColumn = isNumeric(firstRowValue, header);
                                  return (
                                    <th 
                                      key={header}
                                      className={isNumericColumn ? 'numeric-header' : ''}
                                    >
                                      {header}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {insight.tableData.rows.map((row, rowIndex) => (
                                <tr key={`row-${rowIndex}`}>
                                  {sortedHeaders.map((header) => {
                                    const cellValue = row?.[header];
                                    const isNeg = isNegative(cellValue);
                                    const isNum = isNumeric(cellValue, header);
                                    const cellClasses = [
                                      isNeg ? 'negative-value' : '',
                                      isNum ? 'numeric-cell' : ''
                                    ].filter(Boolean).join(' ');
                                    return (
                                      <td 
                                        key={`${rowIndex}-${header}`}
                                        className={cellClasses || undefined}
                                      >
                                        {formatCellValue(cellValue)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                  {insight.pdfUrl && (
                    <div className="insight-pdf">
                      <iframe
                        src={insight.pdfUrl}
                        type="application/pdf"
                        title="PDF chart"
                        className="insight-pdf-iframe"
                      >
                        <p>
                          Your browser does not support PDFs.
                          {' '}
                          <a href={insight.pdfUrl} target="_blank" rel="noreferrer">
                            Download the chart
                          </a>
                          .
                        </p>
                      </iframe>
                      <div className="insight-pdf-fallback">
                        <a
                          href={insight.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="insight-pdf-link"
                        >
                          📄 Open PDF chart in new tab
                        </a>
                      </div>
                    </div>
                  )}
                  {insight.jsonData && (
                    <details className="insight-json">
                      <summary>View structured data</summary>
                      <pre>{JSON.stringify(insight.jsonData, null, 2)}</pre>
                    </details>
                  )}
                  {insight.bibliography && (
                    <div className="insight-bibliography">
                      <strong>Bibliography:</strong>
                      <div className="insight-bibliography-content">
                        {renderRichText(insight.bibliography)}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;

