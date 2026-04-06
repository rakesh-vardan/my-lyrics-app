"use client";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function getSpotifyEmbedUrl(url: string): string | null {
  // Matches open.spotify.com/track/ID or open.spotify.com/album/ID etc.
  const match = url.match(
    /open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
  );
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
}

export default function MediaEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          title="YouTube player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  const spotifyUrl = getSpotifyEmbedUrl(url);
  if (spotifyUrl) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-slate-700">
        <iframe
          src={spotifyUrl}
          title="Spotify player"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="w-full h-20 rounded-xl"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: plain link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
    >
      🎵 Listen on external player ↗
    </a>
  );
}
