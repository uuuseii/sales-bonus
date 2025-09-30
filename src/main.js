/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const totalAmount = sale_price * quantity;
    
    return totalAmount * (1 - (discount / 100));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return 0.15 * profit;
    } else if (index === 1 || index === 2) {
        return 0.1 * profit;
    } else if (index === total - 1) {
        return 0;
    } else {
        return 0.05 * profit;
    };
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || !Array.isArray(data.products)
        || data.sellers.length === 0
        || data.purchase_records.length === 0
        || data.products.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    };

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }; 

    if (typeof calculateRevenue != "function"
        || typeof calculateBonus != "function") {
            throw new Error('Опции не функции');
    };

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    })); 

    const sellerIndex = data.sellers.reduce((result, item, index) => ({
        ...result,
        [item.id]: sellerStats[index]
    }), {}); 

    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item
    }), {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        seller.revenue += record.total_amount; // @TODO

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += 1;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(product => ({
            sku: product[0],
            quantity: product[1]
        })).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    })); 
}
