// Injected script for advanced DOM manipulation and data extraction

class DataExtractor {
  constructor() {
    this.extractedData = [];
    this.initialize();
  }

  initialize() {
    // Listen for messages from content script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data.type && event.data.type.startsWith('AI_SCRAPER_')) {
        this.handleMessage(event.data);
      }
    });

    console.log('AI Data Scraper injected script initialized');
  }

  handleMessage(message) {
    switch (message.type) {
      case 'AI_SCRAPER_EXTRACT_DATA':
        this.extractDataFromPage(message.data);
        break;
      case 'AI_SCRAPER_ANALYZE_PAGINATION':
        this.analyzePagination();
        break;
      case 'AI_SCRAPER_NAVIGATE_PAGE':
        this.navigateToPage(message.data);
        break;
      default:
        console.warn('Unknown message type in injected script:', message.type);
    }
  }

  async extractDataFromPage(config) {
    try {
      const { selectors, exclusions } = config;
      const extractedItems = [];

      // Find all matching elements
      const elements = this.findElementsBySelectors(selectors);
      
      // Filter out excluded elements
      const filteredElements = this.filterExcludedElements(elements, exclusions);

      // Extract data from each element
      for (const element of filteredElements) {
        const itemData = this.extractElementData(element, config);
        if (itemData) {
          extractedItems.push(itemData);
        }
      }

      // Send results back to content script
      this.sendMessage({
        type: 'AI_SCRAPER_EXTRACTION_COMPLETE',
        data: {
          items: extractedItems,
          totalFound: elements.length,
          totalExtracted: extractedItems.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error extracting data:', error);
      this.sendMessage({
        type: 'AI_SCRAPER_EXTRACTION_ERROR',
        error: error.message
      });
    }
  }

  findElementsBySelectors(selectors) {
    const elements = [];
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }

    return elements;
  }

  filterExcludedElements(elements, exclusions) {
    if (!exclusions || exclusions.length === 0) {
      return elements;
    }

    return elements.filter(element => {
      for (const exclusion of exclusions) {
        try {
          if (element.matches(exclusion)) {
            return false;
          }
        } catch (error) {
          console.warn(`Invalid exclusion selector: ${exclusion}`, error);
        }
      }
      return true;
    });
  }

  extractElementData(element, config) {
    const data = {};

    // Extract basic text content
    data.text = element.textContent?.trim() || '';
    
    // Extract attributes
    data.attributes = this.extractAttributes(element);
    
    // Extract links
    data.links = this.extractLinks(element);
    
    // Extract images
    data.images = this.extractImages(element);
    
    // Extract structured data (JSON-LD, microdata, etc.)
    data.structuredData = this.extractStructuredData(element);
    
    // Extract custom fields based on config
    if (config.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        data[fieldName] = this.extractCustomField(element, fieldConfig);
      }
    }

    // Add metadata
    data.extractedAt = new Date().toISOString();
    data.elementSelector = this.getElementSelector(element);
    data.elementXPath = this.getElementXPath(element);

    return data;
  }

  extractAttributes(element) {
    const attributes = {};
    for (let attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  extractLinks(element) {
    const links = [];
    const linkElements = element.querySelectorAll('a[href]');
    
    for (const link of linkElements) {
      links.push({
        text: link.textContent?.trim(),
        href: link.href,
        title: link.title
      });
    }
    
    return links;
  }

  extractImages(element) {
    const images = [];
    const imgElements = element.querySelectorAll('img');
    
    for (const img of imgElements) {
      images.push({
        src: img.src,
        alt: img.alt,
        title: img.title,
        width: img.width,
        height: img.height
      });
    }
    
    return images;
  }

  extractStructuredData(element) {
    const structuredData = [];

    // Extract JSON-LD
    const jsonLdScripts = element.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        structuredData.push({ type: 'json-ld', data });
      } catch (error) {
        console.warn('Invalid JSON-LD:', error);
      }
    }

    // Extract microdata
    const microdataElements = element.querySelectorAll('[itemtype]');
    for (const item of microdataElements) {
      const itemData = this.extractMicrodata(item);
      if (itemData) {
        structuredData.push({ type: 'microdata', data: itemData });
      }
    }

    return structuredData;
  }

  extractMicrodata(element) {
    const data = {
      type: element.getAttribute('itemtype'),
      properties: {}
    };

    const properties = element.querySelectorAll('[itemprop]');
    for (const prop of properties) {
      const propName = prop.getAttribute('itemprop');
      let propValue = prop.textContent?.trim();
      
      // Handle different property types
      if (prop.hasAttribute('content')) {
        propValue = prop.getAttribute('content');
      } else if (prop.hasAttribute('src')) {
        propValue = prop.getAttribute('src');
      } else if (prop.hasAttribute('href')) {
        propValue = prop.getAttribute('href');
      }

      if (propValue) {
        data.properties[propName] = propValue;
      }
    }

    return data;
  }

  extractCustomField(element, fieldConfig) {
    const { selector, attribute, type } = fieldConfig;
    
    try {
      let targetElement = element;
      
      if (selector) {
        targetElement = element.querySelector(selector);
        if (!targetElement) return null;
      }

      switch (type) {
        case 'text':
          return targetElement.textContent?.trim();
        case 'attribute':
          return targetElement.getAttribute(attribute);
        case 'html':
          return targetElement.innerHTML;
        case 'number':
          const text = targetElement.textContent?.trim();
          return text ? parseFloat(text.replace(/[^\d.-]/g, '')) : null;
        case 'date':
          const dateText = targetElement.textContent?.trim();
          return dateText ? new Date(dateText).toISOString() : null;
        default:
          return targetElement.textContent?.trim();
      }
    } catch (error) {
      console.warn('Error extracting custom field:', error);
      return null;
    }
  }

  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  getElementXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    let path = '';
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = element.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = element.tagName.toLowerCase();
      const pathIndex = index > 1 ? `[${index}]` : '';
      path = `/${tagName}${pathIndex}${path}`;
      element = element.parentNode;
    }

    return path;
  }

  analyzePagination() {
    const paginationData = {
      hasPagination: false,
      currentPage: null,
      totalPages: null,
      nextPageUrl: null,
      prevPageUrl: null,
      paginationElements: []
    };

    // Look for common pagination patterns
    const paginationSelectors = [
      '.pagination',
      '.pager',
      '.page-numbers',
      '[class*="pagination"]',
      '[class*="pager"]',
      'nav[aria-label*="pagination"]',
      'nav[aria-label*="pager"]'
    ];

    for (const selector of paginationSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        paginationData.hasPagination = true;
        paginationData.paginationElements.push(...Array.from(elements));
        break;
      }
    }

    // Analyze pagination structure
    if (paginationData.hasPagination) {
      this.analyzePaginationStructure(paginationData);
    }

    this.sendMessage({
      type: 'AI_SCRAPER_PAGINATION_ANALYSIS',
      data: paginationData
    });
  }

  analyzePaginationStructure(paginationData) {
    const paginationElement = paginationData.paginationElements[0];
    
    // Find current page
    const currentPageSelectors = [
      '.current',
      '.active',
      '[aria-current="page"]',
      '.page-numbers.current'
    ];

    for (const selector of currentPageSelectors) {
      const current = paginationElement.querySelector(selector);
      if (current) {
        const pageText = current.textContent?.trim();
        paginationData.currentPage = parseInt(pageText) || 1;
        break;
      }
    }

    // Find next/previous links
    const nextLink = paginationElement.querySelector('a[rel="next"], .next, .next-page');
    if (nextLink) {
      paginationData.nextPageUrl = nextLink.href;
    }

    const prevLink = paginationElement.querySelector('a[rel="prev"], .prev, .prev-page');
    if (prevLink) {
      paginationData.prevPageUrl = prevLink.href;
    }

    // Estimate total pages
    const pageNumbers = paginationElement.querySelectorAll('a, .page-numbers');
    if (pageNumbers.length > 0) {
      const numbers = Array.from(pageNumbers)
        .map(el => parseInt(el.textContent?.trim()))
        .filter(num => !isNaN(num));
      
      if (numbers.length > 0) {
        paginationData.totalPages = Math.max(...numbers);
      }
    }
  }

  navigateToPage(navigationData) {
    const { action, url } = navigationData;
    
    try {
      switch (action) {
        case 'next':
          if (url) {
            window.location.href = url;
          } else {
            this.clickNextPage();
          }
          break;
        case 'prev':
          if (url) {
            window.location.href = url;
          } else {
            this.clickPrevPage();
          }
          break;
        case 'specific':
          if (url) {
            window.location.href = url;
          }
          break;
        default:
          console.warn('Unknown navigation action:', action);
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
      this.sendMessage({
        type: 'AI_SCRAPER_NAVIGATION_ERROR',
        error: error.message
      });
    }
  }

  clickNextPage() {
    const nextSelectors = [
      'a[rel="next"]',
      '.next',
      '.next-page',
      '.pagination .next',
      '.pager .next'
    ];

    for (const selector of nextSelectors) {
      const nextButton = document.querySelector(selector);
      if (nextButton) {
        nextButton.click();
        return;
      }
    }
  }

  clickPrevPage() {
    const prevSelectors = [
      'a[rel="prev"]',
      '.prev',
      '.prev-page',
      '.pagination .prev',
      '.pager .prev'
    ];

    for (const selector of prevSelectors) {
      const prevButton = document.querySelector(selector);
      if (prevButton) {
        prevButton.click();
        return;
      }
    }
  }

  sendMessage(message) {
    window.postMessage(message, '*');
  }
}

// Initialize data extractor
new DataExtractor();