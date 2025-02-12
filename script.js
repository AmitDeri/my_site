document.addEventListener('DOMContentLoaded', function () {
    const header = document.getElementById('header');
    const profileImage = document.getElementById('profile-image');
    const titles = document.querySelectorAll('.title');
    const links = document.getElementById('links');
    const nameElement = document.getElementById('name');
    const fadeElements = document.querySelectorAll('.content h2, .content p');

    // Variables for mobile scrolling
    let nameFixed = false;
    let ticking = false;

    // Scroll Event Handler
    function onScroll() {
        let offset = window.pageYOffset;

        if (offset > 50) {
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }

        if (window.innerWidth < 768) {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    handleScrollEffects(offset);
                    ticking = false;
                });
                ticking = true;
            }
        } else {
            // Reset styles on desktop
            resetStyles();
        }
    }

    // Handle Scroll Effects on Mobile
    function handleScrollEffects(offset) {
        // Calculate fade-out threshold
        const fadeStart = 0; // Start fading immediately
        const fadeUntil = 300; // End fading at 300px scroll
        let opacity = 1;

        if (offset <= fadeStart) {
            opacity = 1;
        } else if (offset >= fadeUntil) {
            opacity = 0;
        } else {
            opacity = 1 - (offset - fadeStart) / (fadeUntil - fadeStart);
        }

        // Apply opacity to elements
        if (opacity < 0) opacity = 0;
        profileImage.style.opacity = opacity;
        links.style.opacity = opacity;
        titles.forEach(function (title) {
            title.style.opacity = opacity;
        });

        // Shrink the profile image
        const scale = Math.max(1 - offset / 500, 0.5);
        profileImage.style.transform = `scale(${scale})`;

        // Fix the name at the top when scrolling past the header
        if (offset > header.offsetHeight) {
            if (!nameFixed) {
                nameElement.classList.add('name-fixed');
                nameFixed = true;
            }
        } else {
            if (nameFixed) {
                nameElement.classList.remove('name-fixed');
                nameFixed = false;
            }
        }
    }

    // Reset Styles on Desktop
    function resetStyles() {
        profileImage.style.opacity = '1';
        profileImage.style.transform = 'none';
        links.style.opacity = '1';
        titles.forEach(function (title) {
            title.style.opacity = '1';
        });
        if (nameFixed) {
            nameElement.classList.remove('name-fixed');
            nameFixed = false;
        }
    }

    window.addEventListener('scroll', onScroll);

    // Intersection Observer for fade-in effect
    const options = {
        threshold: 0.1,
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, options);

    fadeElements.forEach((element) => {
        observer.observe(element);
    });
});
