import {
  extractCurrency,
  extractDescription,
  extractPrice,
  getAveragePrice,
} from "@lib/utils";
import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // Todo: Fetch the product page
    const res = await axios.get(url, options);
    const $ = cheerio.load(res.data);
    // Extract the product title
    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("a-size.base.a-color-price"),
      $(".a-button-selected .a-color-base"),
      $(".a-price.a-text-price"),
      $(".a-offscreen")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavailable";

    const images =
      $("#imageBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));

    const discountRate = $(".savingsPercentage")
      .text()
      .replace(/[-%]/g, "")
      .slice(0, 2);

    const reviewCount = $("#acrCustomerReviewText")
      .text()
      .replace(/[^\d,]/g, "");

    const description = extractDescription($);

    const stars = $(".a-size-base .a-color-base").text().replace(/^(\d+(\.\d+)?).*/, "$1");
    
    // Calculate the average price(mean)
    const averagePrice = (Number(currentPrice) + Number(currentPrice)) / 2;
    
    // Construct data object with scraped information
    const data = {
      url,
      currency: currency || "$",
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: "category",
      reviewsCount: Number(reviewCount) || 100,
      stars: Number(stars) || 4.5,
      isOutOfStock: outOfStock,
      description: description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: averagePrice || Number(currentPrice) || Number(originalPrice),
    };

    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
