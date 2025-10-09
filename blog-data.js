// Central blog data - single source of truth
const blogData = {
    philosophy: [
        {
            id: 'elements-a-reflection',
            title: 'elements- a reflection',
            description: 'finding God',
            date: '10th October',
            url: 'blogs/elements-a-reflection.html'
        },
        {
            id: 'how-to-find-your-purpose',
            title: 'how to find your purpose',
            description: "i did not find mine yet. i'll update this when i do",
            date: 'incomplete',
            url: 'blogs/how-to-find-your-purpose.html'
        }
    ]
};

// Function to populate blog listings on index pages
function populateBlogListings(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !blogData[category]) return;
    
    blogData[category].forEach(blog => {
        const item = document.createElement('div');
        item.className = 'writing-item';
        item.innerHTML = `
            <p class="date">${blog.date}</p>
            <h3><a href="${blog.url}">${blog.title}</a></h3>
            <p class="description">${blog.description}</p>
        `;
        container.appendChild(item);
    });
}

// Function to inject date into individual blog posts
function injectBlogDate() {
    const blogId = document.body.dataset.blogId;
    const dateElement = document.getElementById('blog-date');
    
    if (!blogId || !dateElement) return;
    
    // Search for blog in all categories
    for (const category in blogData) {
        const blog = blogData[category].find(b => b.id === blogId);
        if (blog) {
            dateElement.textContent = blog.date;
            return;
        }
    }
}

