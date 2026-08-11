// Products Data
const products = [
    {
        id: 1,
        name: 'Professional Grade Chlorine Granules',
        price: 24.99,
        image: 'images/product-chlorine.jpg',
        rating: 5,
        reviews: 128
    },
    {
        id: 2,
        name: 'pH Balancer Solution',
        price: 18.99,
        image: 'images/product-ph.jpg',
        rating: 5,
        reviews: 95
    },
    {
        id: 3,
        name: 'Shock Treatment Powder',
        price: 22.99,
        image: 'images/product-chlorine.jpg',
        rating: 4.8,
        reviews: 87
    },
    {
        id: 4,
        name: 'Replacement Filter Cartridge',
        price: 34.99,
        image: 'images/product-filter.jpg',
        rating: 4.9,
        reviews: 112
    },
    {
        id: 5,
        name: 'Water Test Strip Kit',
        price: 14.99,
        image: 'images/product-ph.jpg',
        rating: 4.7,
        reviews: 76
    },
    {
        id: 6,
        name: 'Alkalinity Increaser',
        price: 16.99,
        image: 'images/product-chlorine.jpg',
        rating: 4.8,
        reviews: 64
    }
];

// Cart State
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartCount();
    setupHeaderScroll();
    setupCartDrawer();
});

// Render Products
function renderProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image" style="background-image: url('${product.image}'); background-size: cover; background-position: center;"></div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">€${product.price.toFixed(2)}</div>
                <div class="product-rating">⭐ ${product.rating} (${product.reviews} reviews)</div>
                <button class="product-btn" onclick="addToCart(${product.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// Add to Cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCount();
    updateCartDisplay();
    openCart();
}

// Remove from Cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    updateCartDisplay();
}

// Update Quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartDisplay();
        }
    }
}

// Update Cart Display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">Your cart is empty</p>';
        cartTotal.textContent = '€0.00';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">€${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = '€' + total.toFixed(2);
}

// Update Cart Count
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Cart Drawer
function openCart() {
    document.getElementById('cartDrawer').classList.add('open');
    updateCartDisplay();
}

function closeCart() {
    document.getElementById('cartDrawer').classList.remove('open');
}

function setupCartDrawer() {
    document.getElementById('cartBtn').addEventListener('click', openCart);
    
    // Close cart when clicking outside
    document.addEventListener('click', (e) => {
        const drawer = document.getElementById('cartDrawer');
        const cartBtn = document.getElementById('cartBtn');
        if (!drawer.contains(e.target) && !cartBtn.contains(e.target)) {
            closeCart();
        }
    });
}

// Header Scroll Effect
function setupHeaderScroll() {
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Calculator
function calculateDosage() {
    const volume = parseFloat(document.getElementById('tubVolume').value);
    
    if (!volume || volume <= 0) {
        alert('Please enter a valid volume');
        return;
    }
    
    // Simple dosage calculations (adjust based on actual requirements)
    const chlorine = (volume / 100) * 1.5;
    const ph = (volume / 100) * 0.8;
    const shock = (volume / 100) * 2;
    
    document.getElementById('chlorineAmount').textContent = chlorine.toFixed(1);
    document.getElementById('phAmount').textContent = ph.toFixed(1);
    document.getElementById('shockAmount').textContent = shock.toFixed(1);
    
    document.getElementById('calculatorResults').style.display = 'block';
}

// Initialize cart display on load
updateCartDisplay();
