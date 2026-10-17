
const MEAL_API = "https://www.themealdb.com/api/json/v1/1";
const DRINK_API = "https://www.thecocktaildb.com/api/json/v1/1";

const PAGE_SIZE = 12;

const foodGrid = document.getElementById("food-grid");
const foodStatus = document.getElementById("food-status");
const foodLoadMore = document.getElementById("food-load-more");

const drinkGrid = document.getElementById("cocktail-grid");
const drinkStatus = document.getElementById("cocktail-status");
const drinkLoadMore = document.getElementById("cocktail-load-more");

const dialog = document.getElementById("recipe-dialog");
const details = document.getElementById("recipe-details");

const foodState = {
    meals: [],
    visible: 0,
    area: "all",
    request: 0
};

const drinkState = {
    drinks: [],
    visible: 0,
    request: 0
};

const AREAS = [
    "Indian", "Italian", "Japanese", "Mexican",
    "Canadian", "British", "Chinese", "Thai",
    "French", "Greek", "American", "Turkish",
    "Spanish", "Jamaican", "Moroccan", "Vietnamese"
];

async function getData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to load data.");
    }

    return response.json();
}

function unique(items, key) {
    const map = new Map();

    items.forEach(item => {
        if (item && item[key]) {
            map.set(item[key], item);
        }
    });

    return [...map.values()];
}

async function runInBatches(items, batchSize, callback) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const values = await Promise.all(
            batch.map(item =>
                callback(item).catch(() => [])
            )
        );

        results.push(...values.flat());
    }

    return results;
}

/* FOOD CARDS */

function createFoodCard(meal) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const imageButton = document.createElement("button");
    imageButton.className = "recipe-image-button";
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `View ${meal.strMeal}`);

    const image = document.createElement("img");
    image.src = meal.strMealThumb || "";
    image.alt = meal.strMeal || "Food recipe";
    image.loading = "lazy";

    imageButton.appendChild(image);
    imageButton.addEventListener("click", () => openFood(meal.idMeal));

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
    category.textContent = meal.strCategory || "Food";

    meta.append(area, document.createTextNode(" · "), category);

    const button = document.createElement("button");
    button.className = "recipe-open";
    button.type = "button";
    button.textContent = "View recipe ↗";
    button.addEventListener("click", () => openFood(meal.idMeal));

    info.append(title, meta, button);
    card.append(imageButton, info);

    return card;
}

/* ALCOHOL-FREE DRINK CARDS */

function createDrinkCard(drink) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const imageButton = document.createElement("button");
    imageButton.className = "recipe-image-button";
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `View ${drink.strDrink}`);

    const image = document.createElement("img");
    image.src = drink.strDrinkThumb || "";
    image.alt = drink.strDrink || "Mocktail";
    image.loading = "lazy";

    imageButton.appendChild(image);
    imageButton.addEventListener("click", () => openDrink(drink.idDrink));

    const info = document.createElement("div");
    info.className = "recipe-info";

    const title = document.createElement("h3");
    title.textContent = drink.strDrink;

    const meta = document.createElement("p");
    meta.className = "recipe-meta";

    const category = document.createElement("span");
    category.className = "recipe-category";
    category.textContent = "Alcohol-free";

    const type = document.createElement("span");
    type.textContent = drink.strCategory || "Mocktail";

    meta.append(category, document.createTextNode(" · "), type);

    const button = document.createElement("button");
    button.className = "recipe-open";
    button.type = "button";
    button.textContent = "View recipe ↗";
    button.addEventListener("click", () => openDrink(drink.idDrink));

    info.append(title, meta, button);
    card.append(imageButton, info);

    return card;
}

/* DISPLAY FOOD */

function renderFood(reset = false) {
    if (reset) {
        foodGrid.replaceChildren();
    }

    const next = foodState.meals.slice(
        foodState.visible,
        foodState.visible + PAGE_SIZE
    );

    next.forEach(meal => {
        foodGrid.appendChild(createFoodCard(meal));
    });

    foodState.visible += next.length;

    foodLoadMore.hidden =
        foodState.visible >= foodState.meals.length;

    if (!foodState.meals.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent =
            "No recipes found. Try another search or country.";

        foodGrid.appendChild(empty);
    }

    foodStatus.textContent =
        `${foodState.meals.length} recipes found. ` +
        `${foodState.visible} displayed.`;
}

/* DISPLAY DRINKS */

function renderDrinks(reset = false) {
    if (reset) {
        drinkGrid.replaceChildren();
    }

    const next = drinkState.drinks.slice(
        drinkState.visible,
        drinkState.visible + PAGE_SIZE
    );

    next.forEach(drink => {
        drinkGrid.appendChild(createDrinkCard(drink));
    });

    drinkState.visible += next.length;

    drinkLoadMore.hidden =
        drinkState.visible >= drinkState.drinks.length;

    if (!drinkState.drinks.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent =
            "No alcohol-free drinks found. Try another search.";

        drinkGrid.appendChild(empty);
    }

    drinkStatus.textContent =
        `${drinkState.drinks.length} alcohol-free drinks found. ` +
        `${drinkState.visible} displayed.`;
}

/* LOAD AS MANY FOOD RECIPES AS THE API PROVIDES */

async function loadAllFood() {
    const request = ++foodState.request;

    foodState.area = "all";
    foodState.visible = 0;

    setActiveArea("all");
    foodGrid.replaceChildren();
    foodLoadMore.hidden = true;
    foodStatus.textContent = "Gathering recipes from around the world...";

    try {
        const [countryMeals, categoryData] = await Promise.all([
            runInBatches(AREAS, 4, async area => {
                const data = await getData(
                    `${MEAL_API}/filter.php?a=${encodeURIComponent(area)}`
                );

                return data.meals || [];
            }),

            getData(`${MEAL_API}/list.php?c=list`)
        ]);

        if (request !== foodState.request) return;

        const categories = (categoryData.meals || [])
            .map(item => item.strCategory)
            .filter(Boolean);

        const categoryMeals = await runInBatches(
            categories,
            4,
            async category => {
                const data = await getData(
                    `${MEAL_API}/filter.php?c=${encodeURIComponent(category)}`
                );

                return data.meals || [];
            }
        );

        if (request !== foodState.request) return;

        foodState.meals = unique(
            [...countryMeals, ...categoryMeals],
            "idMeal"
        );

        foodState.visible = 0;
        renderFood(true);

    } catch (error) {
        if (request !== foodState.request) return;

        foodStatus.textContent =
            "Couldn't load recipes. Check your internet connection.";
    }
}

async function filterFood(area) {
    if (area === "all") {
        loadAllFood();
        return;
    }

    const request = ++foodState.request;

    foodState.area = area;
    foodState.visible = 0;

    setActiveArea(area);
    foodGrid.replaceChildren();
    foodLoadMore.hidden = true;
    foodStatus.textContent = `Finding ${area} recipes...`;

    try {
        const data = await getData(
            `${MEAL_API}/filter.php?a=${encodeURIComponent(area)}`
        );

        if (request !== foodState.request) return;

        foodState.meals = data.meals || [];
        foodState.visible = 0;

        renderFood(true);

    } catch (error) {
        if (request !== foodState.request) return;

        foodStatus.textContent =
            `Couldn't load ${area} recipes. Please try again.`;
    }
}

function setActiveArea(area) {
    document.querySelectorAll("#food-filters .filter")
        .forEach(button => {
            const active = button.dataset.area === area;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });
}

/* LOAD ALCOHOL-FREE DRINKS */

async function loadDrinks() {
    const request = ++drinkState.request;

    drinkState.visible = 0;
    drinkGrid.replaceChildren();
    drinkLoadMore.hidden = true;

    drinkStatus.textContent = "Finding alcohol-free drinks...";

    try {
        const data = await getData(
            `${DRINK_API}/filter.php?a=Non_Alcoholic`
        );

        if (request !== drinkState.request) return;

        drinkState.drinks = unique(
            data.drinks || [],
            "idDrink"
        );

        drinkState.visible = 0;
        renderDrinks(true);

    } catch (error) {
        if (request !== drinkState.request) return;

        drinkStatus.textContent =
            "Couldn't load drinks. Check your internet connection.";
    }
}

/* SEARCH FOOD AND ALCOHOL-FREE DRINKS */

async function searchAll(query) {
    const term = query.trim();

    if (!term) {
        loadAllFood();
        loadDrinks();
        return;
    }

    const foodRequest = ++foodState.request;
    const drinkRequest = ++drinkState.request;

    foodState.visible = 0;
    drinkState.visible = 0;

    foodGrid.replaceChildren();
    drinkGrid.replaceChildren();

    foodLoadMore.hidden = true;
    drinkLoadMore.hidden = true;

    foodStatus.textContent = "Searching food...";
    drinkStatus.textContent = "Searching alcohol-free drinks...";

    const results = await Promise.allSettled([
        getData(
            `${MEAL_API}/search.php?s=${encodeURIComponent(term)}`
        ),
        getData(
            `${DRINK_API}/filter.php?a=Non_Alcoholic`
        )
    ]);

    if (foodRequest === foodState.request) {
        foodState.meals =
            results[0].status === "fulfilled"
                ? results[0].value.meals || []
                : [];

        foodState.visible = 0;
        renderFood(true);
    }

    if (drinkRequest === drinkState.request) {
        const allDrinks =
            results[1].status === "fulfilled"
                ? results[1].value.drinks || []
                : [];

        // Search within the alcohol-free drink catalogue.
        drinkState.drinks = allDrinks.filter(drink =>
            drink.strDrink.toLowerCase().includes(term.toLowerCase())
        );

        drinkState.visible = 0;
        renderDrinks(true);
    }
}

/* RECIPE DETAILS */

function showLoading() {
    details.replaceChildren();

    const message = document.createElement("p");
    message.textContent = "Preparing your recipe...";

    details.appendChild(message);

    if (!dialog.open) {
        dialog.showModal();
    }
}

function showError(message) {
    details.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    details.appendChild(paragraph);
}

function addHeading(text) {
    const heading = document.createElement("h2");
    heading.className = "detail-title";
    heading.textContent = text;

    details.appendChild(heading);
}

function addLink(parent, url, text, className = "source-link") {
    if (!url) return;

    const link = document.createElement("a");

    link.href = url;
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = className;

    parent.appendChild(link);
}

function addIngredients(parent, item, prefix, count) {
    const section = document.createElement("section");
    section.className = "detail-section";

    const heading = document.createElement("h3");
    heading.textContent = "Ingredients";

    const list = document.createElement("ul");
    list.className = "ingredient-list";

    for (let i = 1; i <= count; i++) {
        const ingredient = item[`${prefix}Ingredient${i}`]?.trim();
        const measure = item[`${prefix}Measure${i}`]?.trim();

        if (!ingredient) continue;

        const li = document.createElement("li");
        li.textContent = measure
            ? `${measure} ${ingredient}`
            : ingredient;

        list.appendChild(li);
    }

    section.append(heading, list);
    parent.appendChild(section);
}

function addInstructions(text) {
    const section = document.createElement("section");
    section.className = "detail-section";

    const heading = document.createElement("h3");
    heading.textContent = "Instructions";

    const paragraph = document.createElement("p");
    paragraph.className = "instructions";
    paragraph.textContent = text || "Instructions are unavailable.";

    section.append(heading, paragraph);
    details.appendChild(section);
}

async function openFood(id) {
    showLoading();

    try {
        const data = await getData(
            `${MEAL_API}/lookup.php?i=${encodeURIComponent(id)}`
        );

        const meal = data.meals?.[0];

        if (!meal) throw new Error("Recipe unavailable.");

        details.replaceChildren();

        const image = document.createElement("img");
        image.className = "detail-image";
        image.src = meal.strMealThumb || "";
        image.alt = meal.strMeal || "Food recipe";

        details.appendChild(image);
        addHeading(meal.strMeal);

        const description = document.createElement("p");
        description.className = "detail-description";
        description.textContent =
            `${meal.strArea || "World"} cuisine · ` +
            `${meal.strCategory || "Food"}`;

        details.appendChild(description);

        addIngredients(details, meal, "str", 20);
        addInstructions(meal.strInstructions);

        addLink(
            details,
            meal.strYoutube ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(meal.strMeal + " recipe")}`,
            meal.strYoutube
                ? "Watch cooking tutorial ↗"
                : "Find a cooking tutorial ↗",
            "video-link"
        );

        addLink(details, meal.strSource, "View original recipe ↗");

    } catch (error) {
        showError("Couldn't load this recipe. Please try again.");
    }
}

async function openDrink(id) {
    showLoading();

    try {
        const data = await getData(
            `${DRINK_API}/lookup.php?i=${encodeURIComponent(id)}`
        );

        const drink = data.drinks?.[0];

        if (!drink) throw new Error("Drink unavailable.");

        // Only show alcohol-free recipes in this section.
        if (drink.strAlcoholic !== "Non alcoholic") {
            throw new Error("This drink is not alcohol-free.");
        }

        details.replaceChildren();

        const image = document.createElement("img");
        image.className = "detail-image";
        image.src = drink.strDrinkThumb || "";
        image.alt = drink.strDrink || "Mocktail";

        details.appendChild(image);
        addHeading(drink.strDrink);

        const description = document.createElement("p");
        description.className = "detail-description";
        description.textContent =
            `${drink.strCategory || "Drink"} · ` +
            `${drink.strGlass || "Serve in your favourite glass"}`;

        details.appendChild(description);

        addIngredients(details, drink, "str", 15);
        addInstructions(
            drink.strInstructions ||
            drink.strInstructionsEN ||
            "Instructions are unavailable."
        );

    } catch (error) {
        showError("Couldn't load this alcohol-free recipe. Please try again.");
    }
}

/* SURPRISE BUTTONS */

async function randomFood() {
    foodStatus.textContent = "Finding a surprise recipe...";

    try {
        const data = await getData(`${MEAL_API}/random.php`);

        if (data.meals?.[0]) {
            openFood(data.meals[0].idMeal);
        } else {
            foodStatus.textContent = "No recipe found. Try again.";
        }
    } catch (error) {
        foodStatus.textContent = "Couldn't find a recipe. Try again.";
    }
}

async function randomDrink() {
    if (!drinkState.drinks.length) {
        await loadDrinks();
    }

    if (!drinkState.drinks.length) return;

    const randomIndex = Math.floor(
        Math.random() * drinkState.drinks.length
    );

    openDrink(drinkState.drinks[randomIndex].idDrink);
}

/* BUTTON EVENTS */

document.querySelectorAll("#food-filters .filter")
    .forEach(button => {
        button.addEventListener("click", () => {
            filterFood(button.dataset.area);
        });
    });

document.querySelectorAll("#cocktail-filters .filter")
    .forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("#cocktail-filters .filter")
                .forEach(item => {
                    item.classList.toggle("active", item === button);
                });

            loadDrinks();
        });
    });

document.getElementById("food-load-more")
    .addEventListener("click", () => {
        renderFood(false);
    });

document.getElementById("cocktail-load-more")
    .addEventListener("click", () => {
        renderDrinks(false);
    });

document.getElementById("search-form")
    .addEventListener("submit", event => {
        event.preventDefault();

        searchAll(
            document.getElementById("search-input").value
        );
    });

document.getElementById("food-random-button")
    .addEventListener("click", randomFood);

document.getElementById("cocktail-random-button")
    .addEventListener("click", randomDrink);

document.getElementById("close-dialog")
    .addEventListener("click", () => {
        dialog.close();
    });

dialog.addEventListener("click", event => {
    if (event.target === dialog) {
        dialog.close();
    }
});

dialog.addEventListener("close", () => {
    details.replaceChildren();
});

/* START WEBSITE */

foodLoadMore.hidden = true;
drinkLoadMore.hidden = true;

loadAllFood();
loadDrinks();
