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

        if (window.innerWidth >= 768) {
            // Only apply transformations on desktop devices
            if (offset > 50) {
                header.classList.add('shrink');
            } else {
                header.classList.remove('shrink');
            }

            // Additional scroll effects for desktop can be added here
        } else {
            // On mobile devices, avoid applying transformations during scroll
            // Reset styles if necessary
            header.classList.remove('shrink');
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
