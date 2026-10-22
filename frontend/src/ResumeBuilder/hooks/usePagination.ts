import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Where the resume breaks into pages.
 *
 * The preview used to be one fixed-height sheet with `overflow: hidden`, so
 * anything past the first page was simply invisible - you only discovered it
 * by opening the downloaded PDF, where it ran off the bottom edge because the
 * margins were padding on a single box and padding applies once.
 *
 * This measures the blocks as the browser has actually laid them out and
 * decides where each page starts. The preview draws its sheets from those
 * offsets and the same offsets are marked on the DOM for the PDF, so both
 * break in the same places by construction rather than by coincidence.
 *
 * Blocks are the direct children of `.resume-content` - header, summary,
 * skills, experience and so on. A block is never cut in half; one that would
 * straddle a boundary is moved down whole. A block taller than a page is the
 * exception: nothing can save it, so it is allowed to flow.
 */

export interface Pagination {
  /** Content-space offset where each page begins. Length is the page count. */
  pageTops: number[];
  pageCount: number;
  /** Total laid-out height of the content, in px. */
  contentHeight: number;
  /** Usable height of one page, in px (page height minus both margins). */
  pageContentHeight: number;
  /** How full the last page is, 0..1. Above 1 only when a block overflows. */
  fillRatio: number;
  remeasure: () => void;
}

const EMPTY: Omit<Pagination, 'remeasure'> = {
  pageTops: [0],
  pageCount: 1,
  contentHeight: 0,
  pageContentHeight: 0,
  fillRatio: 0,
};

export const usePagination = (
  containerRef: RefObject<HTMLElement>,
  pageContentHeight: number,
  /** Anything that changes the layout: the data and the layout settings. */
  deps: unknown[]
): Pagination => {
  const [result, setResult] = useState(EMPTY);

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root || pageContentHeight <= 0) return;

    const content = root.querySelector('.resume-content') as HTMLElement | null;
    if (!content) return;

    const contentTop = content.getBoundingClientRect().top;
    const rect = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - contentTop, bottom: r.bottom - contentTop };
    };

    /*
     * Fill each page, then break at the smallest sensible piece.
     *
     * Two earlier versions of this were too coarse. Breaking only between the
     * direct children of `.resume-content` moved a whole Projects section to
     * the next page and left the one before it almost empty; descending only
     * into sections taller than a page moved its inner wrapper instead, with
     * the same result one level down.
     *
     * The question is not "is this taller than a page" but "does this still
     * fit in what is left of the current page". If it does, it is a unit. If
     * it does not and it is large enough to be worth opening up, look inside
     * and ask the same question of its parts. Only when there is nothing left
     * to open - a bullet, a line - does a break get placed before it.
     */
    const MIN_SPLITTABLE = 160;

    const atoms: HTMLElement[] = [];
    const pageTops = [0];
    let pageTop = 0;

    const place = (el: HTMLElement) => {
      const { top, bottom } = rect(el);

      // Fits in what is left of this page.
      if (bottom - pageTop <= pageContentHeight) {
        atoms.push(el);
        return;
      }

      const kids = Array.from(el.children) as HTMLElement[];
      if (kids.length > 0 && bottom - top > MIN_SPLITTABLE) {
        kids.forEach(place);
        return;
      }

      // Nothing left to open up, so this piece starts the next page - unless
      // it already does, or it is simply taller than any page, in which case
      // the browser has to break it and a forced break would waste a sheet.
      if (top > pageTop && bottom - top <= pageContentHeight) {
        let startTop = top;

        // Take a heading with it rather than strand it at the foot.
        const prev = atoms[atoms.length - 1];
        if (prev && /^H[1-6]$/.test(prev.tagName)) {
          const pr = rect(prev);
          if (pr.top > pageTop) startTop = pr.top;
        }

        pageTop = startTop;
        pageTops.push(pageTop);
      }

      atoms.push(el);
    };

    (Array.from(content.children) as HTMLElement[]).forEach(place);

    const blocks = atoms;
    const boxes = atoms.map(rect);

    const contentHeight = content.scrollHeight;
    const lastPageTop = pageTops[pageTops.length - 1];

    setResult(prev => {
      const next = {
        pageTops,
        pageCount: pageTops.length,
        contentHeight,
        pageContentHeight,
        fillRatio: Math.max(0, (contentHeight - lastPageTop) / pageContentHeight),
      };
      // setState with a fresh object every measure would re-render forever,
      // because rendering is what triggers the next measure.
      const same =
        prev.pageCount === next.pageCount &&
        prev.contentHeight === next.contentHeight &&
        prev.pageContentHeight === next.pageContentHeight &&
        prev.pageTops.every((v, i) => v === next.pageTops[i]);
      return same ? prev : next;
    });

    // Mark the blocks that start a page, for the PDF. The download clones
    // this subtree, so the markers travel with it and the backend turns them
    // into real page breaks.
    const breakTops = new Set(pageTops.slice(1));
    content.querySelectorAll('[data-page-break],[data-no-split]').forEach(el => {
      el.removeAttribute('data-page-break');
      el.removeAttribute('data-no-split');
    });
    blocks.forEach((el, i) => {
      if (breakTops.has(boxes[i].top)) el.setAttribute('data-page-break', 'true');
      // A piece small enough to be a unit here must stay whole in print too.
      if (boxes[i].bottom - boxes[i].top <= pageContentHeight) {
        el.setAttribute('data-no-split', 'true');
      }
    });
  }, [containerRef, pageContentHeight]);

  useEffect(() => {
    // Two frames: one for React to commit, one for the browser to lay out.
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  // Web fonts land after first paint and change every height with them.
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => { cancelled = true; };
  }, [measure]);

  return { ...result, remeasure: measure };
};
