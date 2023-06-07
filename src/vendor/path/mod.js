// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
// This module is browser compatible.
function stripTrailingSeparators(
  segment,
  isSep,
) {
  if (segment.length <= 1) {
    return segment;
  }

  let end = segment.length;

  for (let i = segment.length - 1; i > 0; i--) {
    if (isSep(segment.charCodeAt(i))) {
      end = i;
    } else {
      break;
    }
  }

  return segment.slice(0, end);
}

export const CHAR_FORWARD_SLASH = 47; /* / */
export function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}

export function dirname(path) {
  if (path.length === 0) return ".";

  let end = -1;
  let matchedNonSeparator = false;

  for (let i = path.length - 1; i >= 1; --i) {
    if (isPosixPathSeparator(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        end = i;
        break;
      }
    } else {
      matchedNonSeparator = true;
    }
  }

  if (end === -1) {
    return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
  }

  return stripTrailingSeparators(
    path.slice(0, end),
    isPosixPathSeparator,
  );
}
