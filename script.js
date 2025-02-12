document.addEventListener('DOMContentLoaded', function () {
    const header = document.getElementById('header');
    const profileImage = document.getElementById('profile-image');
    const title = document.getElementById('title');
    const links = document.getElementById('links');
    const nameElement = document.getElementById('name');
    const fadeElements = document.querySelectorAll('.content h2, .content p');

    // Variables for mobile scrolling
    let nameFixed = false;

    // Scroll event for shrinking header
    window.addEventListener('scroll', function () {
        let offset = window.pageYOffset;

        if (offset > 50) {
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }

        // Apply mobile scrolling effects
        if (window.innerWidth < 768) {
            // Calculate fade-out factor based on scroll position
            let totalHeight = document.body.scrollHeight - window.innerHeight;
            let fadeOutFactor = Math.min(offset / totalHeight, 1);

            // Fade out profile image, links, and title
            let opacityValue = Math.max(1 - fadeOutFactor * 3, 0); // Multiply by 3 for faster fade
            profileImage.style.opacity = opacityValue;
            links.style.opacity = opacityValue;
            title.style.opacity = opacityValue;

            // Shrink the profile image
            let scale = Math.max(1 - offset / 500, 0.5);
            profileImage.style.transform = `translateY(${offset * 0.5}px) scale(${scale})`;

            // Fix the name at the top when scrolling past the header
            if (offset > header.offsetHeight && !nameFixed) {
                nameElement.classList.add('name-fixed');
                nameElement.style.color = '#2d3436'; // Darker color for fixed name
                nameFixed = true;
            } else if (offset <= header.offsetHeight && nameFixed) {
                nameElement.classList.remove('name-fixed');
                nameElement.style.color = ''; // Reset color
                nameFixed = false;
            }
        } else {
            // Reset styles on desktop
            profileImage.style.opacity = '1';
            profileImage.style.transform = 'none';
            title.style.opacity = '1';
            links.style.opacity = '1';
            nameElement.classList.remove('name-fixed');
            nameElement.style.color = '';
            nameFixed = false;
        }
    });

    // Intersection Observer for fade-in effect
    const options = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, options);

    fadeElements.forEach(element => {
        observer.observe(element);
    });
});
