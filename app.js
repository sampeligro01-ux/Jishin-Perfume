```javascript
const cfg = window.SCENTORA_CONFIG || {};

const hasSupabaseConfig =
  cfg.SUPABASE_URL &&
  !cfg.SUPABASE_URL.includes("YOUR_") &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

const supabase =
  hasSupabaseConfig
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      )
    : null;


const state = {
  products: [],
  cart: JSON.parse(
    localStorage.getItem("scentora_cart") || "[]"
  ),
  user: null,
  authMode: "signin"
};


const $ = (id) =>
  document.getElementById(id);


const money = (n) =>
  new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP"
    }
  ).format(Number(n || 0));


const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );


const stars = (rating) => {

  const r =
    Math.max(
      0,
      Math.min(
        5,
        Number(rating || 0)
      )
    );

  return (
    "★".repeat(r) +
    "☆".repeat(5 - r)
  );
};


function saveCart(){

  localStorage.setItem(
    "scentora_cart",
    JSON.stringify(state.cart)
  );

  renderCart();
}


function cartQty(){

  return state.cart.reduce(
    (s, i) => s + i.quantity,
    0
  );

}


function cartTotal(){

  return state.cart.reduce(
    (s, i) =>
      s + Number(i.price) * i.quantity,
    0
  );

}


function addToCart(product){

  const found =
    state.cart.find(
      i => i.id === product.id
    );

  if(found){

    found.quantity += 1;

  }else{

    state.cart.push({
      id: product.id,
      name: product.name,
      price: 250,
      image_url: product.image_url,
      quantity: 1
    });

  }

  saveCart();

  openCart();

}


function renderCart(){

  $("cartCount").textContent =
    cartQty();

  $("cartTotal").textContent =
    money(cartTotal());


  $("cartItems").innerHTML =
    state.cart.length

      ? state.cart.map(i => `

        <div class="cart-item">

          ${
            i.image_url

              ? `
                <img
                  class="cart-thumb"
                  src="${escapeHtml(i.image_url)}"
                  alt="">
              `

              : `
                <div class="cart-thumb"></div>
              `
          }

          <div>

            <h3>
              ${escapeHtml(i.name)}
            </h3>

            <div>
              ${money(250)}
            </div>

            <div class="qty">

              <button
                data-cart-dec="${i.id}">
                −
              </button>

              <span>
                ${i.quantity}
              </span>

              <button
                data-cart-inc="${i.id}">
                +
              </button>

            </div>

          </div>

          <button
            class="small-btn"
            data-cart-remove="${i.id}"
            aria-label="Remove ${escapeHtml(i.name)}">
            ×
          </button>

        </div>

      `).join("")

      : `
        <div class="empty">
          Your cart is empty.
        </div>
      `;

}


function openCart(){

  $("cartDrawer")
    .classList.add("open");

  $("cartDrawer")
    .setAttribute(
      "aria-hidden",
      "false"
    );

}


function closeCart(){

  $("cartDrawer")
    .classList.remove("open");

  $("cartDrawer")
    .setAttribute(
      "aria-hidden",
      "true"
    );

}


/* DEMO PRODUCTS */

const demoProducts = [

  {
    id: "demo-1",
    name: "Velvet Bloom",
    description:
      "Soft rose, vanilla and warm amber.",
    price: 250,
    category: "floral",
    image_url: "",
    seller_id: null,
    avg_rating: 5
  },

  {
    id: "demo-2",
    name: "Cedar After Rain",
    description:
      "Clean woods with a fresh mineral finish.",
    price: 250,
    category: "woody",
    image_url: "",
    seller_id: null,
    avg_rating: 4
  },

  {
    id: "demo-3",
    name: "Citrus Veil",
    description:
      "Bright citrus, white musk and airy florals.",
    price: 250,
    category: "fresh",
    image_url: "",
    seller_id: null,
    avg_rating: 4
  },

  {
    id: "demo-4",
    name: "Amber Nocturne",
    description:
      "Spiced amber, sandalwood and tonka bean.",
    price: 250,
    category: "oriental",
    image_url: "",
    seller_id: null,
    avg_rating: 5
  }

];


async function loadProducts(){

  if(!supabase){

    state.products =
      demoProducts;

    renderProducts();

    $("storeStatus").hidden =
      false;

    $("storeStatus").textContent =
      "Demo mode: add your Supabase URL and anon key in index.html to load the live catalog.";

    return;

  }


  const {
    data,
    error
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      category,
      image_url,
      seller_id,
      created_at,
      reviews(rating)
    `)
    .eq(
      "is_active",
      true
    )
    .order(
      "created_at",
      {ascending: false}
    );


  if(error){

    $("storeStatus").hidden =
      false;

    $("storeStatus").textContent =
      "Unable to load the catalog. Check your Supabase configuration.";

    console.error(error);

    return;

  }


  state.products =
    (data || []).map(
      p => {

        const rs =
          p.reviews || [];

        const avg =
          rs.length
            ? rs.reduce(
                (a, r) =>
                  a + Number(r.rating),
                0
              ) / rs.length
            : 0;

        const {
          reviews,
          ...product
        } = p;

        return {
          ...product,

          /*
           * Every product on Jishin
           * costs exactly ₱250.00.
           */
          price: 250,

          avg_rating:
            Number(avg.toFixed(1))
        };

      }
    );


  $("storeStatus").hidden =
    true;

  renderProducts();

}


function renderProducts(){

  const q =
    $("searchInput")
      .value
      .trim()
      .toLowerCase();

  const cat =
    $("categoryFilter")
      .value;


  const products =
    state.products.filter(
      p =>
        (cat === "all" ||
         p.category === cat)

        &&

        (
          `${p.name} ${p.description || ""}`
        )
        .toLowerCase()
        .includes(q)
    );


  $("productGrid").innerHTML =
    products.length

      ? products.map(
          p => `

            <article class="product-card">

              ${
                p.image_url

                  ? `
                    <img
                      class="product-image"
                      src="${escapeHtml(p.image_url)}"
                      alt="${escapeHtml(p.name)}"
                      loading="lazy">
                  `

                  : `
                    <div
                      class="product-image placeholder"
                      aria-hidden="true">
                      J
                    </div>
                  `
              }


              <div class="product-info">

                <span class="product-category">
                  ${escapeHtml(p.category)}
                </span>

                <h3 class="product-name">
                  ${escapeHtml(p.name)}
                </h3>

                <p class="product-desc">
                  ${escapeHtml(
                    p.description || ""
                  )}
                </p>


                <div class="product-meta">

                  <span class="price">
                    ${money(250)}
                  </span>

                  <span class="rating">
                    ${stars(p.avg_rating || 0)}
                  </span>

                </div>


                <div class="product-actions">

                  <button
                    class="small-btn"
                    data-view="${p.id}">
                    Reviews
                  </button>

                  <button
                    class="small-btn primary"
                    data-add="${p.id}">
                    Add to cart
                  </button>

                </div>

              </div>

            </article>

          `
        ).join("")

      : `
        <div
          class="empty"
          style="grid-column:1/-1">

          No perfumes match your search.

        </div>
      `;

}


async function openProduct(id){

  const p =
    state.products.find(
      x => x.id === id
    );

  if(!p) return;


  let reviews = [];


  if(
    supabase &&
    !String(id).startsWith("demo-")
  ){

    const {
      data
    } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at,
        user_id
      `)
      .eq(
        "product_id",
        id
      )
      .order(
        "created_at",
        {ascending: false}
      );

    reviews =
      data || [];

  }


  $("productModalContent").innerHTML = `

    <p class="eyebrow">
      ${escapeHtml(p.category)}
    </p>

    <h2 id="productModalTitle">
      ${escapeHtml(p.name)}
    </h2>

    <p>
      ${escapeHtml(
        p.description || ""
      )}
    </p>

    <p>
      <strong>
        ${money(250)}
      </strong>

      ·

      <span class="stars">
        ${stars(p.avg_rating || 0)}
      </span>

    </p>


    <div class="review-list">

      <h3>
        Customer reviews
      </h3>

      ${
        reviews.length

          ? reviews.map(
              r => `

                <div class="review">

                  <div class="stars">
                    ${stars(r.rating)}
                  </div>

                  <p>
                    ${escapeHtml(
                      r.review_text ||
                      "No written review."
                    )}
                  </p>

                </div>

              `
            ).join("")

          : `
            <p class="field-help">
              No reviews yet.
            </p>
          `
      }

    </div>


    ${
      supabase &&
      state.user &&
      !String(id).startsWith("demo-")

        ? `

          <form
            class="review-form"
            id="reviewForm">

            <div class="star-input">

              ${[5,4,3,2,1].map(
                n => `

                  <input
                    id="r${n}"
                    type="radio"
                    name="rating"
                    value="${n}"
                    ${n === 5 ? "checked" : ""}>

                  <label
                    for="r${n}"
                    title="${n} stars">
                    ★
                  </label>

                `
              ).join("")}

            </div>


            <textarea
              id="reviewText"
              rows="3"
              maxlength="1000"
              placeholder="Share your experience">
            </textarea>


            <button
              class="btn btn-primary"
              type="submit">
              Submit review
            </button>


            <p
              id="reviewStatus"
              class="form-message"
              role="status">
            </p>

          </form>

        `

        : `

          <p class="field-help">
            ${
              supabase
                ? "Sign in to write a review."
                : "Connect Supabase to enable reviews."
            }
          </p>

        `
    }

  `;


  $("productModal").hidden =
    false;


  const form =
    $("reviewForm");


  if(form){

    form.addEventListener(
      "submit",
      e =>
        submitReview(
          e,
          p.id
        )
    );

  }

}


async function submitReview(
  e,
  productId
){

  e.preventDefault();


  const status =
    $("reviewStatus");


  const rating =
    Number(
      new FormData(
        e.currentTarget
      ).get("rating")
    );


  const text =
    $("reviewText")
      .value
      .trim();


  if(!rating) return;


  status.textContent =
    "Saving...";


  const {
    error
  } = await supabase
    .from("reviews")
    .upsert(
      {
        product_id: productId,
        user_id: state.user.id,
        rating,
        review_text: text
      },
      {
        onConflict:
          "product_id,user_id"
      }
    );


  status.textContent =
    error
      ? "Unable to save review."
      : "Review saved.";


  if(!error){

    await loadProducts();

    await openProduct(
      productId
    );

  }

}


/* AUTH */

function showAuth(){

  $("authModal").hidden =
    false;

  $("authMessage").textContent =
    "";

  $("authSubmit").textContent =
    state.authMode === "signin"
      ? "Sign in"
      : "Create account";

  $("authGcashWrap").hidden =
    state.authMode !== "signup";

  $("signOutBtn").hidden =
    !state.user;


  if(state.user){

    $("authTitle").textContent =
      `Signed in as ${state.user.email}`;

    $("authForm").hidden =
      true;

  }else{

    $("authTitle").textContent =
      "Welcome to Jishin";

    $("authForm").hidden =
      false;

  }

}


function closeModals(){

  document
    .querySelectorAll(".modal")
    .forEach(
      m => m.hidden = true
    );

}


async function handleAuth(e){

  e.preventDefault();


  if(!supabase){

    $("authMessage").textContent =
      "Connect Supabase first.";

    return;

  }


  const email =
    $("authEmail")
      .value
      .trim();

  const password =
    $("authPassword")
      .value;

  const gcash =
    $("authGcash")
      .value
      .trim();


  $("authMessage").textContent =
    "Working...";


  if(
    state.authMode ===
    "signin"
  ){

    const {
      error
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password
        });


    $("authMessage").textContent =
      error
        ? error.message
        : "Signed in.";

  }else{

    if(
      gcash &&
      !/^09\d{9}$/.test(gcash)
    ){

      $("authMessage").textContent =
        "Enter a valid 11-digit GCash number.";

      return;

    }


    const {
      data,
      error
    } =
      await supabase.auth
        .signUp({

          email,
          password,

          options:{
            data:{
              gcash_number:
                gcash || null
            }
          }

        });


    if(error){

      $("authMessage").textContent =
        error.message;

      return;

    }


    if(
      data.user &&
      !data.session
    ){

      $("authMessage").textContent =
        "Account created. Check your email if email confirmation is enabled.";

    }else{

      $("authMessage").textContent =
        "Account created.";

    }

  }

}


async function refreshUser(){

  if(!supabase){

    state.user =
      null;

    updateAccountUI();

    return;

  }


  const {
    data
  } =
    await supabase.auth
      .getUser();


  state.user =
    data.user || null;


  updateAccountUI();

}


function updateAccountUI(){

  $("authBtn").textContent =
    state.user
      ? "Account"
      : "Sign in";


  $("dashboardGate").hidden =
    !!state.user;


  $("productForm").hidden =
    !state.user;


  if(state.user){

    loadProfile();

  }else{

    $("myProducts").innerHTML =
      "";

  }

}


async function loadProfile(){

  if(
    !supabase ||
    !state.user
  ) return;


  const {
    data
  } =
    await supabase
      .from("profiles")
      .select(
        "gcash_number"
      )
      .eq(
        "id",
        state.user.id
      )
      .maybeSingle();


  $("gcashNumber").value =
    data?.gcash_number ||
    state.user.user_metadata?.gcash_number ||
    "";


  const {
    data: products
  } =
    await supabase
      .from("products")
      .select(
        "id,name,price,is_active"
      )
      .eq(
        "seller_id",
        state.user.id
      )
      .order(
        "created_at",
        {ascending: false}
      );


  $("myProducts").innerHTML =
    products?.length

      ? `
        <h3>
          Your listings
        </h3>

        ${
          products.map(
            p => `

              <div class="seller-product">

                <span>
                  ${escapeHtml(p.name)}
                  ·
                  ${money(250)}
                </span>

                <span>
                  ${
                    p.is_active
                      ? "Active"
                      : "Hidden"
                  }
                </span>

              </div>

            `
          ).join("")
        }
      `

      : "";

}


async function publishProduct(e){

  e.preventDefault();


  if(
    !supabase ||
    !state.user
  ) return;


  const name =
    $("productName")
      .value
      .trim();


  /*
   * All seller products are ₱250.00.
   */
  const price = 250;


  const category =
    $("productCategory")
      .value;

  const image_url =
    $("productImage")
      .value
      .trim();

  const description =
    $("productDescription")
      .value
      .trim();

  const gcash =
    $("gcashNumber")
      .value
      .trim();


  const msg =
    $("productFormMessage");


  msg.textContent =
    "Publishing...";


  if(
    gcash &&
    !/^09\d{9}$/.test(gcash)
  ){

    msg.textContent =
      "Enter a valid 11-digit GCash number.";

    return;

  }


  const {
    error: profileError
  } =
    await supabase
      .from("profiles")
      .update({
        gcash_number:
          gcash || null
      })
      .eq(
        "id",
        state.user.id
      );


  if(profileError){

    msg.textContent =
      "Could not save your seller profile.";

    return;

  }


  const {
    error
  } =
    await supabase
      .from("products")
      .insert({

        seller_id:
          state.user.id,

        name,

        description,

        price,

        category,

        image_url:
          image_url || null

      });


  msg.textContent =
    error
      ? "Could not publish product. Check the form and your permissions."
      : "Product published.";


  if(!error){

    e.currentTarget.reset();

    $("gcashNumber").value =
      gcash;

    await loadProducts();

    await loadProfile();

  }

}


/* PAYMONGO CHECKOUT */

async function checkout(){

  const msg =
    $("checkoutMessage");


  if(!state.cart.length){

    msg.textContent =
      "Your cart is empty.";

    return;

  }


  if(
    !supabase ||
    !state.user
  ){

    msg.textContent =
      "Please sign in before checkout.";

    showAuth();

    return;

  }


  msg.textContent =
    "Creating secure checkout...";


  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession();


  const response =
    await fetch(
      "/api/create-checkout",
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${
              session?.access_token || ""
            }`

        },

        body: JSON.stringify({

          items:
            state.cart.map(
              i => ({
                id: i.id,
                quantity: i.quantity
              })
            )

        })

      }
    );


  const data =
    await response
      .json()
      .catch(
        () => ({})
      );


  if(!response.ok){

    msg.textContent =
      data.error ||
      "Unable to create checkout.";

    return;

  }


  window.location.href =
    data.checkout_url;

}


/* CONTACT */

async function submitContact(e){

  e.preventDefault();


  $("contactMessageStatus")
    .textContent =
      "Thank you. Your message has been prepared for support.";


  e.currentTarget.reset();

}


/* CLICK HANDLERS */

document.addEventListener(
  "click",
  async e => {

    const add =
      e.target.closest(
        "[data-add]"
      );


    if(add){

      const p =
        state.products.find(
          x =>
            x.id ===
            add.dataset.add
        );

      if(p)
        addToCart(p);

      return;

    }


    const view =
      e.target.closest(
        "[data-view]"
      );


    if(view){

      await openProduct(
        view.dataset.view
      );

      return;

    }


    const inc =
      e.target.closest(
        "[data-cart-inc]"
      );


    if(inc){

      const i =
        state.cart.find(
          x =>
            x.id ===
            inc.dataset.cartInc
        );


      if(i)
        i.quantity++;


      saveCart();

      return;

    }


    const dec =
      e.target.closest(
        "[data-cart-dec]"
      );


    if(dec){

      const i =
        state.cart.find(
          x =>
            x.id ===
            dec.dataset.cartDec
        );


      if(i){

        i.quantity--;

        if(i.quantity <= 0){

          state.cart =
            state.cart.filter(
              x =>
                x.id !== i.id
            );

        }

      }


      saveCart();

      return;

    }


    const rem =
      e.target.closest(
        "[data-cart-remove]"
      );


    if(rem){

      state.cart =
        state.cart.filter(
          x =>
            x.id !==
            rem.dataset.cartRemove
        );

      saveCart();

      return;

    }


    if(
      e.target.matches(
        "[data-close-modal]"
      )
    ){

      closeModals();

    }


    const mode =
      e.target.closest(
        "[data-auth-mode]"
      );


    if(mode){

      state.authMode =
        mode.dataset.authMode;


      document
        .querySelectorAll(
          "[data-auth-mode]"
        )
        .forEach(
          x =>
            x.classList.toggle(
              "active",
              x === mode
            )
        );


      showAuth();

    }

  }
);


/* EVENTS */

$("searchInput")
  .addEventListener(
    "input",
    renderProducts
  );


$("categoryFilter")
  .addEventListener(
    "change",
    renderProducts
  );


$("cartBtn")
  .addEventListener(
    "click",
    openCart
  );


$("footerCartBtn")
  .addEventListener(
    "click",
    openCart
  );


$("cartClose")
  .addEventListener(
    "click",
    closeCart
  );


$("checkoutBtn")
  .addEventListener(
    "click",
    checkout
  );


$("authBtn")
  .addEventListener(
    "click",
    showAuth
  );


$("dashboardSignIn")
  .addEventListener(
    "click",
    showAuth
  );


$("footerAuthBtn")
  .addEventListener(
    "click",
    showAuth
  );


$("authForm")
  .addEventListener(
    "submit",
    handleAuth
  );


$("signOutBtn")
  .addEventListener(
    "click",
    async () => {

      await supabase.auth
        .signOut();

      closeModals();

    }
  );


$("productForm")
  .addEventListener(
    "submit",
    publishProduct
  );


$("contactForm")
  .addEventListener(
    "submit",
    submitContact
  );


$("navToggle")
  .addEventListener(
    "click",
    () => {

      const open =
        $("mainNav")
          .classList
          .toggle("open");


      $("navToggle")
        .setAttribute(
          "aria-expanded",
          String(open)
        );


      document
        .querySelector(
          ".nav-actions"
        )
        .classList
        .toggle(
          "mobile-visible",
          open
        );

    }
  );


document
  .querySelectorAll(
    ".main-nav a"
  )
  .forEach(
    a =>
      a.addEventListener(
        "click",
        () => {

          $("mainNav")
            .classList
            .remove("open");

          $("navToggle")
            .setAttribute(
              "aria-expanded",
              "false"
            );

          $("navToggle")
            .classList
            .remove("open");

        }
      )
  );


$("year").textContent =
  new Date().getFullYear();


/* SUPABASE AUTH */

if(supabase){

  supabase.auth
    .onAuthStateChange(
      () =>
        refreshUser()
    );

}


/* INITIALIZATION */

renderCart();

loadProducts();
```
