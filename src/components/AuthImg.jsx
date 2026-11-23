import { useEffect, useState } from "react";
import { fetchFileObjectUrl } from "../api";

/**
 * <img> for private uploads. Files now require a login, and a plain <img src>
 * cannot send the Authorization header, so we fetch the bytes and show a
 * blob: URL. A neutral placeholder keeps the layout stable while loading.
 */
export default function AuthImg({ src, alt = "", style, placeholderStyle, ...rest }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setObjectUrl(null);
    setFailed(false);
    if (!src) return undefined;
    fetchFileObjectUrl(src)
      .then((u) => { if (alive) setObjectUrl(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [src]);

  if (!objectUrl) {
    return (
      <div
        role="img"
        aria-label={failed ? `${alt} (could not load)` : alt}
        aria-busy={!failed}
        style={{ ...style, ...placeholderStyle, background: "var(--sl-skeleton, rgba(127,127,127,.15))" }}
      />
    );
  }
  return <img src={objectUrl} alt={alt} style={style} {...rest} />;
}
