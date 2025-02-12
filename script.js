document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('header');
    const content = document.querySelector('.content');

    // Function to determine if scrolling is possible
    function checkScroll() {
        const bodyHeight = document.body.scrollHeight;
        const windowHeight = window.innerHeight;

        if (bodyHeight <= windowHeight) {
            // If there's no scrolling, add 'shrink' class on desktop screens
            if (window.innerWidth >= 768) {
                header.classList.add('shrink');
            }
        }
    }

    // Initial check on load
    checkScroll();

    // Add event listener for window resize to recheck
    window.addEventListener('resize', checkScroll);

    // Scroll event listener
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }
    });
});
