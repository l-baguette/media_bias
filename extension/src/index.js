import allSidesNewsRatings from './allSidesNewsRatings.json';
import mediaBiasFactCheckRatings from './mediaBiasFactCheckRatings.json';
import adFontesMediaReliabilityRatings from './adFontesMediaReliabilityRatings.json';

const newsApiKey = '7bc3405582d44b108101db9d4c3327d6';

async function getTopicsFromBackend(title, firstParagraph) {
    try {
        const response = await fetch('https://media-bias-jwfkuxnam-vedants-projects-ebf03764.vercel.app/get-topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, firstParagraph })
        });

        const data = await response.json();
        console.log('Backend API Response:', data);
        return data.topics || 'No topics found';
    } catch (error) {
        console.error('Backend API Error:', error);
        return 'Error fetching topics';
    }
}

async function fetchRelatedArticles(title) {
    try {
        console.log("Fetching related articles");
        try {
            const response = await fetch('https://media-bias-jwfkuxnam-vedants-projects-ebf03764.vercel.app/get-keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
    
            const data = await response.json();
            console.log('Backend API Response:', data);
            title = data.keywords
        } catch (error) {
            console.error('Backend API Error:', error);
        }

        console.log("tile", title);
        const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(title)}&apiKey=${newsApiKey}`);
        const data = await response.json();
        return data.articles || [];
    } catch (error) {
        console.error('Error fetching related articles:', error);
        return [];
    }
}

function categorizeAndFilterArticles(articles) {
    const categories = {
        '-2.0': null,
        '-1.0': null,
        '0.0': null,
        '1.0': null,
        '2.0': null
    };

    articles.forEach(article => {
        const source = article.source.name;
        const reliability = getReliability(source);
        const bias = getBias(source);
        const biasKey = bias !== 'N/A' ? bias.toString() : 'N/A';
        const strReliability = reliability !== 'N/A' ? reliability.toString() : 'N/A';

        if (strReliability !== 'N/A' && biasKey !== "N/A" && (categories[biasKey] === null || reliability > categories[biasKey].reliability)) {
            categories[biasKey] = { article, source, reliability, bias };
        }
    });

    return categories;
}

function displayRecommendations(categories) {
    const recommendations = [];
    const mostReliableArticles = [];

    ['2.0', '1.0', '0.0', '-1.0', '-2.0'].forEach(category => {
        if (categories[category]) {
            recommendations.push(categories[category]);
        }
    });

    // Collect all articles and find the most reliable ones not already included
    Object.values(categories).forEach(item => {
        if (item) {
            mostReliableArticles.push(item);
        }
    });

    // Sort remaining articles by reliability and fill in the rest of the slots
    mostReliableArticles.sort((a, b) => b.reliability - a.reliability);

    for (let i = recommendations.length; i < 5; i++) {
        if (mostReliableArticles[i]) {
            recommendations.push(mostReliableArticles[i]);
        } else {
            break;
        }
    }

    for (let i = 0; i < 5; i++) {
        const recommendationContainer = document.getElementById(`rec${i + 1}`);
        if (recommendations[i]) {
            const { article, source, reliability, bias } = recommendations[i];
            recommendationContainer.innerHTML = `
                <p><strong>#${i + 1} :</strong> <a href="${article.url}" target="_blank">${article.title}</a>, ${source}, ${bias}, ${reliability}</p>
            `;
        } else {
            recommendationContainer.innerHTML = `
                <p><strong>#${i + 1}:</strong> No recommendation available</p>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOMContentLoaded');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Tabs queried:', tabs);

        chrome.scripting.executeScript(
            {
                target: { tabId: tabs[0].id },
                func: getArticleInfo,
            },
            async (results) => {
                console.log('Script executed, results:', results);

                if (results && results[0] && results[0].result) {
                    const result = results[0].result;
                    console.log('Article Info:', result);

                    document.getElementById('publisher').innerText = result.publisher || 'Not found';
                    document.getElementById('title').innerText = result.title || 'Not found';
                    document.getElementById('topic').innerText = 'Detecting...';

                    const topics = await getTopicsFromBackend(result.title, result.firstParagraph);
                    document.getElementById('topic').innerText = topics;

                    const reliability = getReliability(result.publisher);
                    const bias = getBias(result.publisher);

                    document.getElementById('reliability').innerHTML = `${reliability} <small>(0 to 100)</small>`;
                    document.getElementById('bias').innerHTML = `${bias} <small>(-2 to 2)</small>`;

                    const relatedArticles = await fetchRelatedArticles(result.title);
                    const categorizedArticles = categorizeAndFilterArticles(relatedArticles);
                    console.log(categorizedArticles);
                    displayRecommendations(categorizedArticles);
                } else {
                    console.error('Error fetching article info from page.');
                }
            }
        );
    });
});

function getArticleInfo() {
    let title = '';
    let publisher = '';
    let firstParagraph = '';

    const metaTags = document.getElementsByTagName('meta');
    for (let meta of metaTags) {
        if (meta.getAttribute('property') === 'og:title' || meta.getAttribute('name') === 'title') {
            title = meta.getAttribute('content');
        }
        if (meta.getAttribute('property') === 'og:site_name' || meta.getAttribute('name') === 'publisher' || meta.getAttribute('name') === 'og:site_name') {
            publisher = meta.getAttribute('content');
        }
    }

    if (!title) {
        title = document.title;
    }

    if (!publisher) {
        publisher = window.location.hostname;
    }

    const paragraphs = document.getElementsByTagName('p');
    if (paragraphs.length > 0) {
        firstParagraph = paragraphs[0].innerText;
    }

    return { title, publisher, firstParagraph };
}

function getReliability(source) {
    const matchingSource = Object.keys(adFontesMediaReliabilityRatings).find(key =>
        source.toLowerCase().includes(key.toLowerCase())
    );
    return matchingSource ? Math.round(adFontesMediaReliabilityRatings[matchingSource] / 64 * 100) : 'N/A';
}

function getBias(source) {
    const biasMap = {
        'right': 2,
        'right-center': 1,
        'center': 0,
        'left-center': -1,
        'left': -2
    };

    const allSidesSource = Object.keys(allSidesNewsRatings).find(key =>
        source.toLowerCase().includes(key.toLowerCase())
    );
    const mediaBiasSource = Object.keys(mediaBiasFactCheckRatings).find(key =>
        source.toLowerCase().includes(key.toLowerCase())
    );

    const allSidesBias = allSidesSource ? biasMap[allSidesNewsRatings[allSidesSource]] : null;
    const mediaBiasBias = mediaBiasSource ? biasMap[mediaBiasFactCheckRatings[mediaBiasSource]] : null;

    if (allSidesBias !== null && mediaBiasBias !== null) {
        return ((allSidesBias + mediaBiasBias) / 2).toFixed(1);
    } else if (allSidesBias !== null) {
        return allSidesBias.toFixed(1);
    } else if (mediaBiasBias !== null) {
        return mediaBiasBias.toFixed(1);
    } else {
        return 'N/A';
    }
}
