document.addEventListener('DOMContentLoaded', function () {
    const header = document.getElementById('header');
    const profileImage = document.getElementById('profile-image');
    const title = document.getElementById('title');
    const links = document.getElementById('links');
    const fadeElements = document.querySelectorAll('.content h2, .content p');

    // Scroll event for shrinking header
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            header.classList.add('shrink');

            // On mobile, hide the title and links when scrolled down
            if (window.innerWidth < 768) {
                title.style.opacity = '0';
                links.style.opacity = '0';
            }
        } else {
            header.classList.remove('shrink');

            // On mobile, show the title and links when at the top
            if (window.innerWidth < 768) {
                title.style.opacity = '1';
                links.style.opacity = '1';
            }
        }

        // Parallax effect on profile image for mobile
        if (window.innerWidth < 768) {
            let offset = window.pageYOffset;
            profileImage.style.transform = `translateY(${offset * 0.5}px) scale(${1 - offset / 1000})`;
            title.style.transform = `translateY(${offset * 0.3}px)`;
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
