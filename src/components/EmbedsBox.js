import React, { useEffect } from 'react';

function ensureScriptLoaded(src) {
  if (!document.querySelector(`script[src="${src}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.body.appendChild(script);
  } else {
    // Re-append to trigger processing of new embeds if needed
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.body.appendChild(script);
  }
}

function renderRedditEmbed(url) {
  return (
    <blockquote className="reddit-card" key={url} data-card-created={Date.now()}>
      <a href={url}>Loading Reddit post…</a>
    </blockquote>
  );
}

function extractTikTokId(url) {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : undefined;
}

function renderTikTokEmbed(url) {
  const videoId = extractTikTokId(url);
  return (
    <blockquote className="tiktok-embed" key={url} cite={url} data-video-id={videoId} style={{ maxWidth: 605, minWidth: 325 }}>
      <section>
        <a href={url}>View on TikTok</a>
      </section>
    </blockquote>
  );
}

function renderIframeEmbed(url) {
  return (
    <div key={url} className="embed-iframe-wrapper">
      <iframe 
        className="embed-iframe" 
        src={url} 
        title={url} 
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

function renderYouTubeEmbed(url) {
  return (
    <div key={url} className="embed-iframe-wrapper">
      <iframe 
        className="embed-iframe" 
        src={url} 
        title="YouTube video player" 
        loading="lazy" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowFullScreen
      />
    </div>
  );
}

export default function EmbedsBox({ urls = [] }) {
  useEffect(() => {
    if (urls.some((u) => u.includes('reddit.com'))) {
      ensureScriptLoaded('https://embed.redditmedia.com/widgets/platform.js');
    }
    if (urls.some((u) => u.includes('tiktok.com'))) {
      ensureScriptLoaded('https://www.tiktok.com/embed.js');
    }
  }, [urls]);

  return (
    <div className="embeds-box">
      <h2 className="embeds-title">Day in the lives: Other sources</h2>
      {urls.length === 0 ? (
        <div className="embeds-placeholder">Add Reddit or TikTok links to display embeds here.</div>
      ) : (
        <div className="embeds-content">
          {urls.map((url) => {
            if (url.includes('trends.google.com')) return renderIframeEmbed(url);
            if (url.includes('youtube.com/embed')) return renderYouTubeEmbed(url);
            if (url.includes('reddit.com')) return renderRedditEmbed(url);
            if (url.includes('tiktok.com')) return renderTikTokEmbed(url);
            return (
              <div className="embed-unsupported" key={url}>
                Unsupported link: {url}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


