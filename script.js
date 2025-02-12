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

        // Parallax effect on profile image and fading elements (Mobile)
        if (window.innerWidth < 768) {
            let offset = window.pageYOffset;

            // Fade out profile image and links
            profileImage.style.opacity = Math.max(1 - offset / 200, 0);
            links.style.opacity = Math.max(1 - offset / 200, 0);
            title.style.opacity = Math.max(1 - offset / 200, 0);

            // Shrink the profile image
            let scale = Math.max(1 - offset / 500, 0.5);
            profileImage.style.transform = `translateY(${offset * 0.5}px) scale(${scale})`;

            // Change name to fixed position after scrolling past the header
            if (offset > header.offsetHeight && !nameFixed) {
                nameElement.classList.add('name-fixed');
                nameElement.style.color = '#2d3436'; // Darker color for fixed name
                nameFixed = true;
            } else if (offset <= header.offsetHeight && nameFixed) {
                nameElement.classList.remove('name-fixed');
                nameElement.style.color = ''; // Reset color
                nameFixed = false;
            }
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
