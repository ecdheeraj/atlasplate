const API = "https://www.themealdb.com/api/json/v1/1";

const grid = document.getElementById("recipe-grid");
const statusText = document.getElementById("status");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const heading = document.getElementById("recipe-heading");
const dialog = document.getElementById("recipe-dialog");
const details = document.getElementById("recipe-details");

let currentArea = "all";
let requestNumber = 0;

async function getMeals(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load recipes.");
    const data = await response.json();
    return data.meals || [];
}

function createCard(meal) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const imageButton = document.createElement("button");
    imageButton.className = "recipe-image-button";
    imageButton.setAttribute("aria-label", `View ${meal.strMeal}`);

    const image = document.createElement("img");
    image.src = meal.strMealThumb;
    image.alt = meal.strMeal;
    image.loading = "lazy";
    imageButton.appendChild(image);
    imageButton.addEventListener("click", () => openRecipe(meal.idMeal));

    const info = document.createElement("div");
    info.className = "recipe-info";

    const title = document.createElement("h3");
    title.textContent = meal.strMeal;

    const meta = document.createElement("p");
    meta.className = "recipe-meta";

    const area = document.createElement("span");
    area.className = "recipe-category";
    area.textContent = meal.strArea || "World cuisine";

    const category = document.createElement("span");
    category.textContent = meal.strCategory || "Recipe";
    meta.append(area, document.createTextNode(" · "), category);

    const openButton = document.createElement("button");
    openButton.className = "recipe-open";
    openButton.textContent = "View recipe ↗";
    openButton.addEventListener("click", () => openRecipe(meal.idMeal));

    info.append(title, meta, openButton);
    card.append(imageButton, info);
    return card;
}

function displayMeals(meals, message = "") {
    grid.replaceChildren();

    if (!meals.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No recipes found. Try another search or cuisine.";
        grid.appendChild(empty);
        statusText.textContent = message;
        return;
    }

    const fragment = document.createDocumentFragment();
    meals.forEach(meal => fragment.appendChild(createCard(meal)));
    grid.appendChild(fragment);
    statusText.textContent = message;
}

async function loadHome() {
    const thisRequest = ++requestNumber;
    currentArea = "all";
    updateActiveFilter("all");
    heading.textContent = "Recipes to fall for.";
    statusText.textContent = "Finding something delicious...";

    const searches = ["chicken", "pasta", "salmon", "beef", "cake", "rice"];

    try {
        const results = await Promise.all(
            searches.map(name =>
                getMeals(`${API}/search.php?s=${encodeURIComponent(name)}`)
            )
        );

        if (thisRequest !== requestNumber) return;

        const uniqueMeals = new Map();
        results.flat().forEach(meal => uniqueMeals.set(meal.idMeal, meal));
        const meals = Array.from(uniqueMeals.values()).slice(0, 12);

        displayMeals(meals, `${meals.length} recipes to inspire your next meal.`);
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        showError();
    }
}

async function searchRecipes(query) {
    if (!query.trim()) {
        loadHome();
        return;
    }

    const thisRequest = ++requestNumber;
    currentArea = "all";
    updateActiveFilter("all");
    heading.textContent = `Results for "${query}"`;
    statusText.textContent = "Searching recipes...";
    grid.replaceChildren();

    try {
        const meals = await getMeals(
            `${API}/search.php?s=${encodeURIComponent(query.trim())}`
        );
        if (thisRequest !== requestNumber) return;
        displayMeals(meals, `${meals.length} matching recipes found.`);
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        showError();
    }
}

async function filterCuisine(area) {
    const thisRequest = ++requestNumber;
    currentArea = area;
    updateActiveFilter(area);
    heading.textContent = area === "all" ? "Recipes to fall for." : `${area} recipes`;
    statusText.textContent = "Exploring cuisines...";
    grid.replaceChildren();

    if (area === "all") {
        loadHome();
        return;
    }

    try {
        const meals = await getMeals(
            `${API}/filter.php?a=${encodeURIComponent(area)}`
        );
        if (thisRequest !== requestNumber) return;
        displayMeals(meals, `${meals.length} recipes from ${area}.`);
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        showError();
    }
}

function updateActiveFilter(area) {
    document.querySelectorAll(".filter").forEach(button => {
        const selected = button.dataset.area === area;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

async function openRecipe(id) {
    details.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = "Preparing your recipe...";
    details.appendChild(loading);
    if (!dialog.open) dialog.showModal();

    try {
        const meals = await getMeals(`${API}/lookup.php?i=${encodeURIComponent(id)}`);
        if (!meals[0]) throw new Error("Recipe unavailable.");
        renderRecipeDetails(meals[0]);
    } catch (error) {
        details.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "Sorry, this recipe could not be loaded. Please try again.";
        details.appendChild(message);
    }
}

function renderRecipeDetails(meal) {
    details.replaceChildren();

    const image = document.createElement("img");
    image.className = "detail-image";
    image.src = meal.strMealThumb;
    image.alt = meal.strMeal;

    const title = document.createElement("h2");
    title.className = "detail-title";
    title.textContent = meal.strMeal;

    const description = document.createElement("p");
    description.className = "detail-description";
    description.textContent = `${meal.strArea || "World"} cuisine · ${meal.strCategory || "Recipe"}`;
    details.append(image, title, description);

    const ingredientSection = document.createElement("section");
    ingredientSection.className = "detail-section";

    const ingredientTitle = document.createElement("h3");
    ingredientTitle.textContent = "Ingredients";

    const ingredientList = document.createElement("ul");
    ingredientList.className = "ingredient-list";

    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();
        if (!ingredient) continue;

        const item = document.createElement("li");
        item.textContent = measure ? `${measure} ${ingredient}` : ingredient;
        ingredientList.appendChild(item);
    }

    ingredientSection.append(ingredientTitle, ingredientList);

    const instructionSection = document.createElement("section");
    instructionSection.className = "detail-section";

    const instructionTitle = document.createElement("h3");
    instructionTitle.textContent = "Let's cook";

    const instructions = document.createElement("p");
    instructions.className = "instructions";
    instructions.textContent = meal.strInstructions || "Instructions are not available.";

    instructionSection.append(instructionTitle, instructions);
    details.append(ingredientSection, instructionSection);

    const video = document.createElement("a");
    video.className = "video-link";
    video.href = meal.strYoutube ||
        `https://www.youtube.com/results?search_query=${encodeURIComponent(meal.strMeal + " recipe tutorial")}`;
    video.target = "_blank";
    video.rel = "noopener noreferrer";
    video.textContent = meal.strYoutube
        ? "Watch cooking tutorial ↗"
        : "Find a YouTube tutorial ↗";
    details.appendChild(video);

    if (meal.strSource) {
        const source = document.createElement("p");
        source.className = "detail-description";
        const sourceLink = document.createElement("a");
        sourceLink.href = meal.strSource;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.textContent = "View original recipe ↗";
        source.appendChild(sourceLink);
        details.appendChild(source);
    }
}

function showError() {
    statusText.textContent =
        "We couldn't load recipes. Check your internet connection and try again.";
    grid.replaceChildren();
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchRecipes(searchInput.value);
});

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        searchInput.value = "";
        filterCuisine(button.dataset.area);
    });
});

document.getElementById("random-button").addEventListener("click", async () => {
    const thisRequest = ++requestNumber;
    statusText.textContent = "Finding a surprise...";
    grid.replaceChildren();

    try {
        const meals = await getMeals(`${API}/random.php`);
        if (thisRequest !== requestNumber) return;

        if (meals[0]) {
            statusText.textContent = "Your surprise recipe is ready!";
            openRecipe(meals[0].idMeal);
        } else {
            showError();
        }
    } catch (error) {
        if (thisRequest !== requestNumber) return;
        showError();
    }
});

document.getElementById("close-dialog").addEventListener("click", () => {
    dialog.close();
});

dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
});

loadHome();
