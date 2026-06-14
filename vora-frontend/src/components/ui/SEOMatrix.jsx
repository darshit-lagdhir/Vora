import React, { useEffect } from 'react';

/**
 * Dynamic SEO Side-Effect Injector for Vora Single-Page App (SPA).
 * Updates document.title and maps meta properties (description, og:tags, twitter:cards, JSON-LD schema blocks).
 */
export default function SEOMatrix({ title, description, image, type = 'website', articleData = null }) {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title ? `${title} — Hosted on Vora` : 'Vora | The Premium Virtual Event Ecosystem';
    document.title = formattedTitle;

    // Helper to select or create a meta tag
    const setMetaTag = (attributeName, attributeValue, contentValue) => {
      if (!contentValue) return;
      let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attributeName, attributeValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentValue);
    };

    // 2. Set Description clamped to optimal 155 chars for Google search index
    const cleanDesc = description ? description.substring(0, 155) : 'Orchestrate virtual events with premium aesthetics and low-latency streaming.';
    setMetaTag('name', 'description', cleanDesc);

    // 3. Open Graph Tags
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', cleanDesc);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', window.location.href);
    if (image) {
      setMetaTag('property', 'og:image', image);
    }

    // 4. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', cleanDesc);
    if (image) {
      setMetaTag('name', 'twitter:image', image);
    }

    // 5. JSON-LD Structured Data Schema Dot Org Injection for Search Result Carousels (Task 2 JSON-LD)
    let scriptEl = document.getElementById('json-ld-seo-matrix');
    if (articleData) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'json-ld-seo-matrix';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": articleData.title || title,
        "startDate": articleData.startDate,
        "endDate": articleData.endDate || articleData.startDate,
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "VirtualLocation",
          "url": window.location.href
        },
        "image": image || "https://vora.com/default-banner.png",
        "description": cleanDesc,
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "price": articleData.price || "149.00",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "validFrom": new Date().toISOString()
        },
        "organizer": {
          "@type": "Organization",
          "name": articleData.organizerName || "Vora Core Organizer",
          "url": "https://vora.com"
        }
      };

      scriptEl.textContent = JSON.stringify(structuredData);
    } else {
      if (scriptEl) {
        scriptEl.remove();
      }
    }

    return () => {
      // Clean up dynamic structured script on route transition unmount
      const currentScript = document.getElementById('json-ld-seo-matrix');
      if (currentScript) {
        currentScript.remove();
      }
    };
  }, [title, description, image, type, articleData]);

  return null;
}
