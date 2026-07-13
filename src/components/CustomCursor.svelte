<script>
  import { onMount } from "svelte";

  let x = 0, y = 0;
  let isHovering = false;
  let isMobile = false;

  onMount(() => {
    isMobile = 'ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) {
      document.body.classList.remove('cursor-none');
      return;
    }
    document.body.classList.add('cursor-none');

    let ticking = false;
    function updateCursor(e) {
      if (!ticking) {
        requestAnimationFrame(() => {
          x = e.clientX;
          y = e.clientY;
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('mousemove', updateCursor);

    function handleMouseOver(e) {
      if (e.target.matches('a, button, input, select, textarea')) {
        isHovering = true;
      }
    }

    function handleMouseOut(e) {
      if (e.target.matches('a, button, input, select, textarea')) {
        isHovering = false;
      }
    }

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.body.classList.remove('cursor-none');
      window.removeEventListener('mousemove', updateCursor);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  });
</script>

{#if !isMobile}
<div
  id="custom-cursor"
  class="fixed pointer-events-none z-[9999] border-2 border-[#0284c7]"
  style="
    left: {x}px;
    top: {y}px;
    width: {isHovering ? '40px' : '15px'};
    height: {isHovering ? '40px' : '15px'};
    transform: translate(-50%, -50%);
    border-radius: {isHovering ? '4px' : '50%'};
    background-color: {isHovering ? 'rgba(2, 132, 199, 0.2)' : 'transparent'};
  "
></div>
{/if}