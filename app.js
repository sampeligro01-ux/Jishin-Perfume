"use strict";

/*
    ============================================================
    JISHIN SCENTS
    Frontend application
    ============================================================

    IMPORTANT:
    Replace the two Supabase placeholders below with:

    Supabase Dashboard
    → Project Settings
    → Data API / API
    → Project URL
    → Publishable key / anon key
*/

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);


/* ============================================================
   STATE
============================================================ */

const state = {
    user: null,
    profile: null,
    products: [],
    reviews: [],
    cart: loadCart(),
    selectedProduct: null,
    selectedRating: 5
};


/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   FORMATTERS
============================================================ */

function formatPHP(value) {

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
    }).format(Number(value) || 0);
}


function formatDate(value) {

    if (!value) return "";

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(new Date(value));
}


/* ============================================================
   TOAST
============================================================ */

let toastTimer;

function showToast(message) {

    const toast = $("#toast");

    toast.textContent = message;
    toast.classList.add("active");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("active");
    }, 3500);
}


/* ============================================================
   MODALS
============================================================ */

function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}


function closeModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".modal.active")) {
        document.body.style.overflow = "";
    }
}


$$("[data-close-modal]").forEach(button => {

    button.addEventListener("click", () => {

        closeModal(button.dataset.closeModal);

    });

});


$$(".modal-overlay").forEach(overlay => {

    overlay.addEventListener("click", () => {

        const modal = overlay.closest(".modal");

        if (modal) {
            closeModal(modal.id);
        }

    });

});


/* ============================================================
   MOBILE MENU
============================================================ */

$("#mobileMenuButton").addEventListener("click", () => {

    $("#mainNavigation").classList.toggle("active");

});


$$(".main-navigation a").forEach(link => {

    link.addEventListener("click", () => {

        $("#mainNavigation").classList.remove("active");

    });

});


/* ============================================================
   CART
============================================================ */

function loadCart() {

    try {

        const saved = localStorage.getItem("jishin_scents_cart");

        return saved ? JSON.parse(saved) : [];

    } catch {

        return [];

    }

}


function saveCart() {

    localStorage.setItem(
        "jishin_scents_cart",
        JSON.stringify(state.cart)
    );

}


function getCartCount() {

    return state.cart.reduce(
        (total, item) => total + Number(item.quantity),
        0
    );

}


function getCartTotal() {

    return state.cart.reduce(
        (total, item) =>
            total + Number(item.price) * Number(item.quantity),
        0
    );

}


function updateCartBadge() {

    $("#cartCount").textContent = getCartCount();

}


function addToCart(productId) {

    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) return;

    if (Number(product.stock) <= 0) {

        showToast("This product is currently out of stock.");

        return;

    }

    const existing = state.cart.find(
        item => item.product_id === productId
    );

    if (existing) {

        if (existing.quantity >= Number(product.stock)) {

            showToast("You cannot add more than the available stock.");

            return;

        }

        existing.quantity += 1;

    } else {

        state.cart.push({
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            image_url: product.image_url,
            quantity: 1
        });

    }

    saveCart();
    renderCart();

    showToast(`${product.name} added to your cart.`);

}


function removeFromCart(productId) {

    state.cart = state.cart.filter(
        item => item.product_id !== productId
    );

    saveCart();
    renderCart();

}


function changeCartQuantity(productId, change) {

    const item = state.cart.find(
        cartItem => cartItem.product_id === productId
    );

    if (!item) return;

    const product = state.products.find(
        productItem => productItem.id === productId
    );

    const maxStock = product
        ? Number(product.stock)
        : Infinity;

    item.quantity += change;

    if (item.quantity < 1) {
        removeFromCart(productId);
        return;
    }

    if (item.quantity > maxStock) {

        item.quantity = maxStock;

        showToast("Quantity limited to available stock.");

    }

    saveCart();
    renderCart();

}


function renderCart() {

    updateCartBadge();

    const container = $("#cartItems");

    if (!state.cart.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>Your bag is empty.</h3>
                <p>Add a fragrance from the store.</p>
            </div>
        `;

        $("#cartTotal").textContent = formatPHP(0);

        return;

    }

    container.innerHTML = state.cart.map(item => `

        <div class="cart-item">

            <img
                class="cart-item-image"
                src="${escapeHtml(item.image_url)}"
                alt="${escapeHtml(item.name)}"
                onerror="this.src='https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=500&q=80'"
            >

            <div>

                <h4>${escapeHtml(item.name)}</h4>

                <p>
                    ${formatPHP(item.price)}
                </p>

                <div class="cart-quantity">

                    <button
                        type="button"
                        data-cart-minus="${escapeHtml(item.product_id)}"
                    >
                        −
                    </button>

                    <span>
                        ${item.quantity}
                    </span>

                    <button
                        type="button"
                        data-cart-plus="${escapeHtml(item.product_id)}"
                    >
                        +
                    </button>

                </div>

            </div>

            <button
                type="button"
                class="remove-cart-item"
                data-cart-remove="${escapeHtml(item.product_id)}"
            >
                Remove
            </button>

        </div>

    `).join("");

    $("#cartTotal").textContent = formatPHP(getCartTotal());


    $$("[data-cart-minus]").forEach(button => {

        button.addEventListener("click", () => {

            changeCartQuantity(
                button.dataset.cartMinus,
                -1
            );

        });

    });


    $$("[data-cart-plus]").forEach(button => {

        button.addEventListener("click", () => {

            changeCartQuantity(
                button.dataset.cartPlus,
                1
            );

        });

    });


    $$("[data-cart-remove]").forEach(button => {

        button.addEventListener("click", () => {

            removeFromCart(
                button.dataset.cartRemove
            );

        });

    });

}


$("#cartButton").addEventListener("click", () => {

    renderCart();

    $("#cartDrawer").classList.add("active");
    $("#cartDrawer").setAttribute("aria-hidden", "false");

});


$("#footerCartButton").addEventListener("click", () => {

    renderCart();

    $("#cartDrawer").classList.add("active");
    $("#cartDrawer").setAttribute("aria-hidden", "false");

});


$("#closeCartButton").addEventListener("click", () => {

    $("#cartDrawer").classList.remove("active");
    $("#cartDrawer").setAttribute("aria-hidden", "true");

});


/* ============================================================
   AUTH
============================================================ */

function updateAuthUI() {

    const loggedIn = Boolean(state.user);

    if (!loggedIn) {

        $("#authForms").querySelector(".auth-tabs").hidden = false;

        $("#loginForm").hidden = false;
        $("#registerForm").hidden = true;
        $("#accountProfile").hidden = true;

        return;

    }

    $("#authForms").querySelector(".auth-tabs").hidden = true;

    $("#loginForm").hidden = true;
    $("#registerForm").hidden = true;
    $("#accountProfile").hidden = false;

    if (state.profile) {

        $("#profileName").textContent =
            state.profile.display_name || "Jishin User";

        $("#profileEmail").textContent =
            state.user.email || "";

        $("#profileRole").textContent =
            state.profile.role === "seller"
                ? "Seller Account"
                : "Buyer Account";

        $("#profileDisplayName").value =
            state.profile.display_name || "";

        $("#profileGcash").value =
            state.profile.gcash_number || "";

        $("#sellerStatus").textContent =
            state.profile.role === "seller"
                ? "Seller Account"
                : "Buyer Account";

    }

}


$("#accountButton").addEventListener("click", () => {

    updateAuthUI();
    openModal("accountModal");

});


$("#footerAccountButton").addEventListener("click", () => {

    updateAuthUI();
    openModal("accountModal");

});


$("#loginTab").addEventListener("click", () => {

    $("#loginTab").classList.add("active");
    $("#registerTab").classList.remove("active");

    $("#loginForm").hidden = false;
    $("#registerForm").hidden = true;

});


$("#registerTab").addEventListener("click", () => {

    $("#registerTab").classList.add("active");
    $("#loginTab").classList.remove("active");

    $("#loginForm").hidden = true;
    $("#registerForm").hidden = false;

});


$("#loginForm").addEventListener("submit", async event => {

    event.preventDefault();

    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        showToast(error.message);

        return;

    }

    showToast("Signed in successfully.");

    closeModal("accountModal");

    await loadCurrentUser();

});


$("#registerForm").addEventListener("submit", async event => {

    event.preventDefault();

    const name = $("#registerName").value.trim();
    const email = $("#registerEmail").value.trim();
    const password = $("#registerPassword").value;
    const gcash = $("#registerGcash").value.trim();

    const { data, error } =
        await supabaseClient.auth.signUp({

            email,
            password,

            options: {
                data: {
                    display_name: name,
                    gcash_number: gcash
                }
            }

        });

    if (error) {

        showToast(error.message);

        return;

    }

    if (!data.session) {

        showToast(
            "Account created. Check your email to confirm your account."
        );

    } else {

        showToast("Account created successfully.");

    }

});


$("#profileForm").addEventListener("submit", async event => {

    event.preventDefault();

    if (!state.user) return;

    const displayName =
        $("#profileDisplayName").value.trim();

    const gcash =
        $("#profileGcash").value.trim();

    const { data, error } =
        await supabaseClient.rpc(
            "update_profile",
            {
                p_display_name: displayName,
                p_gcash_number: gcash
            }
        );

    if (error) {

        showToast(error.message);

        return;

    }

    state.profile = data;

    updateAuthUI();

    showToast("Profile updated.");

});


$("#logoutButton").addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        showToast(error.message);

        return;

    }

    state.user = null;
    state.profile = null;

    updateAuthUI();

    closeModal("accountModal");

    showToast("Signed out.");

});


async function loadCurrentUser() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    state.user = session?.user || null;

    if (!state.user) {

        state.profile = null;

        updateAuthUI();

        return;

    }

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .maybeSingle();

    if (error) {

        console.error(error);

        showToast(
            "Unable to load your profile."
        );

        return;

    }

    state.profile = data;

    updateAuthUI();

    await loadSellerProducts();

}


supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        state.user = session?.user || null;

        if (!state.user) {

            state.profile = null;

            updateAuthUI();

            return;

        }

        await loadCurrentUser();

    }
);


/* ============================================================
   PRODUCTS
============================================================ */

async function loadProducts() {

    const grid = $("#productsGrid");

    grid.innerHTML = `
        <div class="empty-state">
            <h3>Loading scents...</h3>
            <p>Please wait.</p>
        </div>
    `;

    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select(`
            id,
            name,
            slug,
            description,
            price,
            image_url,
            stock,
            is_active,
            seller_id,
            created_at
        `)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="empty-state">
                <h3>Store unavailable.</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;

        return;

    }

    state.products = data || [];

    await loadReviews();

    renderProducts();

}


async function loadReviews() {

    const {
        data,
        error
    } = await supabaseClient
        .from("product_reviews")
        .select(`
            id,
            product_id,
            rating,
            review,
            created_at
        `)
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        state.reviews = [];

        return;

    }

    state.reviews = data || [];

}


function getProductRating(productId) {

    const reviews = state.reviews.filter(
        review => review.product_id === productId
    );

    if (!reviews.length) {

        return {
            average: 0,
            count: 0
        };

    }

    const total = reviews.reduce(
        (sum, review) =>
            sum + Number(review.rating),
        0
    );

    return {
        average: total / reviews.length,
        count: reviews.length
    };

}


function renderStars(rating) {

    const rounded = Math.round(Number(rating) || 0);

    return "★★★★★"
        .split("")
        .map((star, index) =>
            `<span style="opacity:${index < rounded ? "1" : "0.25"}">${star}</span>`
        )
        .join("");

}


function renderProducts() {

    const grid = $("#productsGrid");

    if (!state.products.length) {

        grid.innerHTML = "";

        $("#emptyProducts").hidden = false;

        return;

    }

    $("#emptyProducts").hidden = true;

    grid.innerHTML = state.products.map(product => {

        const rating =
            getProductRating(product.id);

        return `

            <article class="product-card">

                <div class="product-image">

                    <img
                        src="${escapeHtml(product.image_url)}"
                        alt="${escapeHtml(product.name)}"
                        loading="lazy"
                        onerror="this.src='https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=800&q=80'"
                    >

                </div>

                <div class="product-info">

                    <span class="product-category">
                        Jishin Marketplace
                    </span>

                    <h3>
                        ${escapeHtml(product.name)}
                    </h3>

                    <div class="product-rating">

                        ${renderStars(rating.average)}

                        <span>
                            ${rating.count
                                ? `${rating.average.toFixed(1)} (${rating.count})`
                                : "No reviews"}
                        </span>

                    </div>

                    <p class="product-description">
                        ${escapeHtml(
                            product.description.length > 120
                                ? product.description.slice(0, 120) + "..."
                                : product.description
                        )}
                    </p>

                    <div class="product-bottom">

                        <div>

                            <div class="product-price">
                                ${formatPHP(product.price)}
                            </div>

                            <div class="product-stock">
                                ${product.stock} available
                            </div>

                        </div>

                        <div class="product-actions">

                            <button
                                type="button"
                                class="outline-button"
                                data-view-product="${escapeHtml(product.id)}"
                            >
                                View
                            </button>

                            <button
                                type="button"
                                class="primary-button"
                                data-add-product="${escapeHtml(product.id)}"
                            >
                                Add
                            </button>

                        </div>

                    </div>

                </div>

            </article>

        `;

    }).join("");


    $$("[data-add-product]").forEach(button => {

        button.addEventListener("click", () => {

            addToCart(button.dataset.addProduct);

        });

    });


    $$("[data-view-product]").forEach(button => {

        button.addEventListener("click", () => {

            openProduct(button.dataset.viewProduct);

        });

    });

}


$("#refreshProductsButton").addEventListener(
    "click",
    loadProducts
);


/* ============================================================
   PRODUCT DETAIL / REVIEWS
============================================================ */

function openProduct(productId) {

    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) return;

    state.selectedProduct = product;
    state.selectedRating = 5;

    const productReviews =
        state.reviews.filter(
            review => review.product_id === productId
        );

    const rating =
        getProductRating(productId);

    $("#productModalContent").innerHTML = `

        <div class="product-detail">

            <div class="product-detail-image">

                <img
                    src="${escapeHtml(product.image_url)}"
                    alt="${escapeHtml(product.name)}"
                    onerror="this.src='https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=800&q=80'"
                >

            </div>

            <div class="product-detail-info">

                <span class="eyebrow">
                    JISHIN SCENTS
                </span>

                <h2>
                    ${escapeHtml(product.name)}
                </h2>

                <div class="product-rating">
                    ${renderStars(rating.average)}
                    ${rating.count
                        ? `${rating.average.toFixed(1)} / 5`
                        : "No ratings yet"}
                </div>

                <div class="detail-price">
                    ${formatPHP(product.price)}
                </div>

                <p>
                    ${escapeHtml(product.description)}
                </p>

                <p class="product-stock">
                    ${product.stock} unit(s) available
                </p>

                <button
                    type="button"
                    class="primary-button full-width"
                    id="detailAddToCart"
                >
                    Add to Cart
                </button>

                <div class="review-section">

                    <h3>
                        Customer Reviews
                    </h3>

                    <form id="reviewForm">

                        <div>

                            <label>
                                Rating
                            </label>

                            <div
                                class="stars"
                                id="reviewStars"
                            >

                                ${[1,2,3,4,5].map(number => `
                                    <button
                                        type="button"
                                        class="star-button ${number <= 5 ? "selected" : ""}"
                                        data-rating="${number}"
                                    >
                                        ★
                                    </button>
                                `).join("")}

                            </div>

                        </div>

                        <label>
                            Your Review

                            <textarea
                                id="reviewText"
                                maxlength="1000"
                                required
                                placeholder="Share your experience..."
                            ></textarea>

                        </label>

                        <button
                            type="submit"
                            class="outline-button"
                        >
                            Submit Review
                        </button>

                    </form>

                    <div class="review-list">

                        ${
                            productReviews.length
                                ? productReviews.map(review => `
                                    <div class="review-item">

                                        <div class="review-stars">
                                            ${renderStars(review.rating)}
                                        </div>

                                        <p>
                                            ${escapeHtml(review.review)}
                                        </p>

                                        <small>
                                            ${formatDate(review.created_at)}
                                        </small>

                                    </div>
                                `).join("")
                                : `
                                    <p>
                                        No reviews yet.
                                        Be the first to review this product.
                                    </p>
                                `
                        }

                    </div>

                </div>

            </div>

        </div>

    `;

    $("#detailAddToCart").addEventListener(
        "click",
        () => addToCart(product.id)
    );


    $$("[data-rating]").forEach(button => {

        button.addEventListener("click", () => {

            state.selectedRating =
                Number(button.dataset.rating);

            updateRatingButtons();

        });

    });


    $("#reviewForm").addEventListener(
        "submit",
        submitReview
    );

    updateRatingButtons();

    openModal("productModal");

}


function updateRatingButtons() {

    $$("[data-rating]").forEach(button => {

        const rating =
            Number(button.dataset.rating);

        button.classList.toggle(
            "selected",
            rating <= state.selectedRating
        );

    });

}


async function submitReview(event) {

    event.preventDefault();

    if (!state.user) {

        showToast(
            "Please sign in before submitting a review."
        );

        return;

    }

    if (!state.selectedProduct) return;

    const review =
        $("#reviewText").value.trim();

    if (!review) return;

    const {
        error
    } = await supabaseClient
        .from("product_reviews")
        .insert({
            product_id: state.selectedProduct.id,
            user_id: state.user.id,
            rating: state.selectedRating,
            review
        });

    if (error) {

        if (
            error.code === "23505"
        ) {

            showToast(
                "You have already reviewed this product."
            );

        } else {

            showToast(error.message);

        }

        return;

    }

    showToast(
        "Review submitted successfully."
    );

    $("#reviewText").value = "";

    await loadProducts();

    openProduct(state.selectedProduct.id);

}


/* ============================================================
   SELLER
============================================================ */

async function becomeSeller() {

    if (!state.user) {

        showToast(
            "Please create an account first."
        );

        openModal("accountModal");

        return;

    }

    if (state.profile?.role === "seller") {

        showToast(
            "You are already a seller."
        );

        openSellerModal();

        return;

    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "become_seller"
    );

    if (error) {

        showToast(error.message);

        return;

    }

    state.profile = data;

    updateAuthUI();

    showToast(
        "Your seller account is now active."
    );

    openSellerModal();

}


$("#becomeSellerButton").addEventListener(
    "click",
    becomeSeller
);


$("#openSellerFormButton").addEventListener(
    "click",
    openSellerModal
);


function openSellerModal() {

    if (!state.user) {

        showToast(
            "Please sign in first."
        );

        openModal("accountModal");

        return;

    }

    if (state.profile?.role !== "seller") {

        showToast(
            "Become a seller before posting products."
        );

        return;

    }

    openModal("sellerModal");

}


$("#productForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (!state.user) {

            showToast(
                "Please sign in."
            );

            return;

        }

        if (state.profile?.role !== "seller") {

            showToast(
                "Seller access is required."
            );

            return;

        }

        const name =
            $("#productName").value.trim();

        const description =
            $("#productDescription").value.trim();

        const price =
            Number($("#productPrice").value);

        const stock =
            Number($("#productStock").value);

        const imageUrl =
            $("#productImage").value.trim();

        if (
            !name ||
            !description ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            !imageUrl
        ) {

            showToast(
                "Please enter valid product information."
            );

            return;

        }

        const slug =
            name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
                .slice(0, 80)
            + "-"
            + crypto.randomUUID().slice(0, 8);


        const {
            error
        } = await supabaseClient
            .from("products")
            .insert({
                seller_id: state.user.id,
                name,
                slug,
                description,
                price,
                stock,
                image_url,
                is_active: true
            });

        if (error) {

            showToast(error.message);

            return;

        }

        showToast(
            "Product published successfully."
        );

        $("#productForm").reset();

        closeModal("sellerModal");

        await loadProducts();
        await loadSellerProducts();

    }
);


async function loadSellerProducts() {

    if (!state.user) {

        $("#sellerProductCount").textContent = "0";

        return;

    }

    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select("id")
        .eq("seller_id", state.user.id);

    if (error) {

        console.error(error);

        return;

    }

    $("#sellerProductCount").textContent =
        data?.length || 0;

}


/* ============================================================
   PAYMONGO CHECKOUT
============================================================ */

async function startCheckout() {

    if (!state.cart.length) {

        showToast(
            "Your shopping cart is empty."
        );

        return;

    }

    if (!state.user) {

        showToast(
            "Please sign in before checkout."
        );

        openModal("accountModal");

        return;

    }

    const sessionResult =
        await supabaseClient.auth.getSession();

    const session =
        sessionResult.data.session;

    if (!session) {

        showToast(
            "Your session has expired. Please sign in again."
        );

        return;

    }

    const items =
        state.cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));


    const button = $("#checkoutButton");

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent =
        "Creating checkout...";


    try {

        const response =
            await fetch(
                "/api/create-checkout",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${session.access_token}`
                    },

                    body: JSON.stringify({
                        items
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Unable to create checkout."
            );

        }


        if (!result.checkout_url) {

            throw new Error(
                "PayMongo did not return a checkout URL."
            );

        }


        localStorage.removeItem(
            "jishin_scents_cart"
        );

        state.cart = [];

        saveCart();

        renderCart();

        window.location.href =
            result.checkout_url;

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Unable to start payment."
        );

    } finally {

        button.disabled = false;
        button.textContent =
            originalText;

    }

}


$("#checkoutButton").addEventListener(
    "click",
    startCheckout
);


/* ============================================================
   PAYMENT RETURN MESSAGE
============================================================ */

function handlePaymentReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const payment =
        params.get("payment");

    if (payment === "success") {

        showToast(
            "Payment submitted. Your order will be marked paid after PayMongo confirms the webhook."
        );

    }

    if (payment === "cancelled") {

        showToast(
            "Payment was cancelled. Your cart was not charged."
        );

    }

}


/* ============================================================
   KEYBOARD
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") return;

        document
            .querySelectorAll(".modal.active")
            .forEach(modal => {
                closeModal(modal.id);
            });

        $("#cartDrawer")
            .classList.remove("active");

    }
);


/* ============================================================
   INITIALIZATION
============================================================ */

async function initializeApp() {

    if (
        SUPABASE_URL.includes("YOUR_") ||
        SUPABASE_ANON_KEY.includes("YOUR_")
    ) {

        showToast(
            "Configure your Supabase URL and key in app.js."
        );

    }

    updateCartBadge();
    renderCart();

    await loadCurrentUser();
    await loadProducts();

    handlePaymentReturn();

}


initializeApp();
