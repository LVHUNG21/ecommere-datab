const util = require('util');
const redisClient = require('../utils/redisClient');

const addProduct = (connection) => (req, res) => {
    const { name, title, description, weight, price, category, product_type_id, currency, minimal_variant_price_amount, variants, warehouse_id } = req.body;
    let { quantity } = req.body;

    // Kiểm tra từng trường bắt buộc riêng lẻ
    if (!name) return res.status(400).json({ error: 'Missing required field: name' });
    if (!title) return res.status(400).json({ error: 'Missing required field: title' });
    if (!weight) return res.status(400).json({ error: 'Missing required field: weight' });
    if (!product_type_id) return res.status(400).json({ error: 'Missing required field: product_type_id' });
    if (!warehouse_id) return res.status(400).json({ error: 'Missing required field: warehouse_id' });

    connection.query('SELECT category_id FROM Category WHERE category_name = ?', [category], (categoryError, categoryResults) => {
        if (categoryError) {
            console.error('Error finding category:', categoryError);
            return res.status(500).json({ error: 'Internal server error finding category' });
        }

        if (categoryResults.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        const categoryId = categoryResults[0].category_id;

        connection.query('SELECT has_variants FROM product_producttype WHERE id = ?', [product_type_id], (typeError, typeResults) => {
            if (typeError) {
                console.error('Error finding product type:', typeError);
                return res.status(500).json({ error: 'Internal server error finding product type' });
            }

            if (typeResults.length === 0) {
                return res.status(404).json({ error: 'Product type not found' });
            }
            const hasVariants = typeResults[0].has_variants;

            if (hasVariants && (!variants || variants.length === 0)) {
                return res.status(400).json({ error: 'Product type requires variants, but no variants were provided.' });
            }
            if (!hasVariants && !price) {
                return res.status(400).json({ error: 'Price is required for products without variants.' });
            }
            connection.query(
                'INSERT INTO product (Category_id, Seller_id, name, title, description, weight, created_at, product_type_id, currency, minimal_variant_price_amount, available_for_purchase) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, FALSE)',
                [categoryId, req.user.id, name, title, description, weight, product_type_id, currency, hasVariants ? minimal_variant_price_amount : price],
                (productError, productResult) => {
                    if (productError) {
                        console.error('Error inserting product:', productError);
                        return res.status(500).json({ error: 'Internal server error adding product' });
                    }
                    const productId = productResult.insertId;
                    if (hasVariants) {
                        let minPrice = variants[0].price;
                        let defaultVariantId = null;
                        const insertVariantPromises = variants.map((variant, index) => {
                            return new Promise((resolve, reject) => {
                                connection.query(
                                    'INSERT INTO product_productvariant (product_id, name, price, weight) VALUES (?, ?, ?, ?)',
                                    [productId, variant.name, variant.price, variant.weight],
                                    (variantError, variantResult) => {
                                        if (variantError) return reject(variantError);
                                        if (variant.price < minPrice) {
                                            minPrice = variant.price;
                                        }
                                        if (index === 0) {
                                            defaultVariantId = variantResult.insertId;
                                        }
                                        const variantId = variantResult.insertId;
                                        quantity = variant.quantity || 0;
                                        connection.query(
                                            'INSERT INTO warehousestock (product_variant_id, warehouse_id, quantity) VALUES (?, ?, ?)',
                                            [variantId, warehouse_id, quantity],
                                            (warehouseError) => {
                                                if (warehouseError) return reject(warehouseError);
                                                resolve();
                                            }
                                        );
                                    }
                                );
                            });
                        });

                        Promise.all(insertVariantPromises)
                            .then(() => {
                                connection.query(
                                    'UPDATE product SET minimal_variant_price_amount = ?, default_variant_id = ?, available_for_purchase = TRUE WHERE Product_id = ?',
                                    [minPrice, defaultVariantId, productId],
                                    (updateError) => {
                                        if (updateError) {
                                            console.error('Error updating product:', updateError);
                                            return res.status(500).json({ error: 'Internal server error updating product' });
                                        }
                                        res.status(201).json({ message: 'Product added successfully', product_id: productId });
                                    }
                                );
                            })
                            .catch((variantError) => {
                                console.error('Error inserting variants:', variantError);
                                res.status(500).json({ error: 'Internal server error adding variants' });
                            });
                    } else {
                        connection.query(
                            'INSERT INTO product_productvariant (product_id, name, price, weight) VALUES (?, ?, ?, ?)',
                            [productId, name, price, weight],
                            (variantError, variantResult) => {
                                if (variantError) {
                                    console.error('Error inserting default variant:', variantError);
                                    return res.status(500).json({ error: 'Internal server error adding default variant' });
                                }

                                const defaultVariantId = variantResult.insertId;
                                connection.query(
                                    'UPDATE product SET default_variant_id = ?, minimal_variant_price_amount = ?, available_for_purchase = TRUE WHERE Product_id = ?',
                                    [defaultVariantId, price, productId],
                                    (updateError) => {
                                        if (updateError) {
                                            console.error('Error updating product:', updateError);
                                            return res.status(500).json({ error: 'Internal server error updating product' });
                                        }

                                        quantity = quantity || 0;
                                        connection.query(
                                            'INSERT INTO warehousestock (product_variant_id, warehouse_id, quantity) VALUES (?, ?, ?)',
                                            [defaultVariantId, warehouse_id, quantity],
                                            (warehouseError) => {
                                                if (warehouseError) {
                                                    console.error('Error inserting warehouse stock:', warehouseError);
                                                    return res.status(500).json({ error: 'Internal server error adding warehouse stock' });
                                                }
                                                res.status(201).json({ message: 'Product added successfully', product_id: productId });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                }
            );
        });
    });
};
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};
const searchProduct = (connection) => (req, res) => {
    const { name } = req.query;
    console.log("name",name);

    let query = `
        SELECT * 
        FROM product
        WHERE 1 = 1
    `;
    
    const queryParams = [];

    if (name) {
        query += ' AND name LIKE ?';
        queryParams.push(`%${name}%`);
    }

    connection.query(query, queryParams, (error, results) => {
        if (error) {
            console.error('Error searching products:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if(results.length>0){
        res.status(200).json(results);
        }else{
            res.status(200).json({message:'There are no matching results for the search term'})
        }
    });
};


const addProductType = (connection, req, res) => {
    const { name, has_variants } = req.body;
    const query = 'INSERT INTO product_producttype (name, has_variants) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), has_variants = VALUES(has_variants)';
    connection.query(query, [name, has_variants], (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(201).json({ message: 'Product type added successfully', typeId: results.insertId });
    });
};
const addProductAttribute = (connection, req, res) => {
    const { nameAttribute, is_filterable, position } = req.body;

    // Kiểm tra trùng lặp nameAttribute
    const checkQuery = 'SELECT id FROM product_attribute WHERE nameAtribbute = ?';
    connection.query(checkQuery, [nameAttribute], (checkError, checkResults) => {
        if (checkError) {
            res.status(500).json({ error: 'Internal server error check duplicate nameAttibute' });
            return;
        }

        if (checkResults.length > 0) {
            res.status(409).json({ error: 'Attribute name already exists' });
            return;
        }

        // Kiểm tra trùng lặp position
        const checkPositionQuery = 'SELECT id FROM product_attribute WHERE position = ?';
        connection.query(checkPositionQuery, [position], (positionError, positionResults) => {
            if (positionError) {
                res.status(500).json({ error: 'Internal server error check duplicate positon ' });
                return;
            }

            if (positionResults.length > 0) {
                // Cập nhật position cho các thuộc tính khác nếu position bị trùng
                const updatePositionQuery = 'UPDATE product_attribute SET position = position + 1 WHERE position >= ?';
                connection.query(updatePositionQuery, [position], (updateError, updateResults) => {
                    if (updateError) {
                        res.status(500).json({ error: 'Internal server error ' });
                        return;
                    }

                    // Thêm thuộc tính sau khi đã cập nhật position
                    const query = 'INSERT INTO product_attribute (nameAtribbute, is_filterable, position) VALUES (?, ?, ?)';
                    connection.query(query, [nameAttribute, is_filterable, position], (error, results) => {
                        if (error) {
                            res.status(500).json({ error: 'Internal server error' });
                            return;
                        }
                        res.status(201).json({ message: 'Product attribute added successfully' });
                    });
                });
            } else {
                // Thêm thuộc tính nếu không bị trùng position
                const query = 'INSERT INTO product_attribute (nameAtribbute, is_filterable, position) VALUES (?, ?, ?)';
                connection.query(query, [nameAttribute, is_filterable, position], (error, results) => {
                    if (error) {
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }
                    res.status(201).json({ message: 'Product attribute added successfully' });
                });
            }
        });
    });
};
const addProductAttributeValue = (connection, req, res) => {
    const { nameValue, attribute_id, attribute_value } = req.body;

    // Kiểm tra xem nameValue, attribute_id và attribute_value có được cung cấp hay không
    if (!nameValue || !attribute_id || !attribute_value) {
        res.status(400).json({ error: 'Missing required fields: nameValue, attribute_id, or attribute_value' });
        return;
    }

    // Kiểm tra xem attribute_id có tồn tại trong bảng product_attribute không
    const checkAttributeQuery = 'SELECT id FROM product_attribute WHERE id = ?';
    connection.query(checkAttributeQuery, [attribute_id], (error, results) => {
        if (error) {
            console.error('Error checking attribute_id:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        // Nếu không tìm thấy attribute_id trong bảng product_attribute
        if (results.length === 0) {
            res.status(404).json({ error: `Attribute with id ${attribute_id} not found` });
            return;
        }

        // Nếu attribute_id tồn tại, thực hiện thêm giá trị thuộc tính
        const query = `
            INSERT INTO product_attributevalue (nameValue, attribute_id, attribute_value)
            VALUES (?, ?, ?)
        `;

        connection.query(query, [nameValue, attribute_id, attribute_value], (error, results) => {
            if (error) {
                console.error('Error adding product attribute value:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            res.status(201).json({ message: 'Product attribute value added successfully', valueId: results.insertId });
        });
    });
};
const returnProduct = (connection) => async (req, res) => {
    const { Product_id, reason, status, created_at } = req.body;

    if (!Product_id || !reason || !status || !created_at) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const query = `
        INSERT INTO return_p (Product_id, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?)
    `;

    const queryParams = [Product_id, reason, status, created_at];

    try {
        const result = await connection.query(query, queryParams);
        res.status(200).json({ message: 'Product return processed successfully', returnId: result.insertId });
    } catch (error) {
        console.error('Error processing return:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAllProducts = (connection) => (req, res) => {
    const { sort } = req.query;

    let query = `
        SELECT p.*, c.category_name 
        FROM product p
        JOIN Category c ON p.Category_id = c.category_id
    `;

    if (sort) {
        switch (sort) {
            case 'price_low_to_high':
                query += ' ORDER BY p.minimal_variant_price_amount ASC';
                break;
            case 'price_high_to_low':
                query += ' ORDER BY p.minimal_variant_price_amount DESC';
                break;
            case 'name':
                query += ' ORDER BY p.name ASC';
                break;
            case 'created':
                query += ' ORDER BY p.created_at DESC';
                break;
            default:
                query += ' ORDER BY p.created_at DESC';
        }
    } else {
        query += ' ORDER BY p.created_at DESC';
    }

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error retrieving products:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(200).json(results);
    });
};

;

// New 
const addProductAttributeVariant = (connection, req, res) => {
    const { product_type_id, attribute_id } = req.body;

    const checkForeignKey = `
        SELECT
            (SELECT COUNT(*) FROM product_producttype WHERE id = ?) as producttype_exists,
            (SELECT COUNT(*) FROM product_attribute WHERE id = ?) as attribute_exists
    `;
    connection.query(checkForeignKey, [product_type_id, attribute_id], (fkError, fkResults) => {
        if (fkError) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (!fkResults[0].producttype_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: product_type_id does not exist' });
            return;
        }

        if (!fkResults[0].attribute_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: attribute_id does not exist' });
            return;
        }

        const query = 'INSERT INTO product_attributevariant (product_type_id, attribute_id) VALUES (?, ?)';
        connection.query(query, [product_type_id, attribute_id], (error, results) => {
            if (error) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            res.status(201).json({ message: 'Attribute variant added successfully' });
        });
    });
};

const addProductAttributeProduct = (connection, req, res) => {
    const { product_type_id, attribute_id } = req.body;

    const checkForeignKey = `
        SELECT
            (SELECT COUNT(*) FROM product_producttype WHERE id = ?) as producttype_exists,
            (SELECT COUNT(*) FROM product_attribute WHERE id = ?) as attribute_exists
    `;
    connection.query(checkForeignKey, [product_type_id, attribute_id], (fkError, fkResults) => {
        if (fkError) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (!fkResults[0].producttype_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: product_type_id does not exist' });
            return;
        }

        if (!fkResults[0].attribute_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: attribute_id does not exist' });
            return;
        }

        const query = 'INSERT INTO product_attributeproduct (product_type_id, attribute_id) VALUES (?, ?)';
        connection.query(query, [product_type_id, attribute_id], (error, results) => {
            if (error) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            res.status(201).json({ message: 'Attribute product added successfully' });
        });
    });
};

const assignProductAttributeToProduct = (connection, req, res) => {
    const { product_id, attributeproduct_id } = req.body;

    const checkForeignKey = `
        SELECT
            (SELECT COUNT(*) FROM product WHERE Product_id = ?) as product_exists,
            (SELECT COUNT(*) FROM product_attributeproduct WHERE id = ?) as attributeproduct_exists
    `;
    connection.query(checkForeignKey, [product_id, attributeproduct_id], (fkError, fkResults) => {
        if (fkError) {
            res.status(500).json({ error: 'Internal server error check foreignKey' });
            return;
        }

        if (!fkResults[0].product_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: product_id does not exist' });
            return;
        }

        if (!fkResults[0].attributeproduct_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: attributeproduct_id does not exist' });
            return;
        }

        const checkQuery = 'SELECT * FROM product_assignproductattribute WHERE product_id = ? AND attributeproduct_id = ?';
        connection.query(checkQuery, [product_id, attributeproduct_id], (checkError, checkResults) => {
            if (checkError) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (checkResults.length > 0) {
                res.status(400).json({ error: 'Duplicate entry: The combination of product_id and attributeproduct_id already exists' });
                return;
            }

            const query = 'INSERT INTO product_assignproductattribute (product_id, attributeproduct_id) VALUES (?, ?)';
            connection.query(query, [product_id, attributeproduct_id], (error, results) => {
                if (error) {
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                res.status(201).json({ message: 'Product attribute assigned to product successfully' });
            });
        });
    });
};

const assignVariantAttributeToVariant = (connection, req, res) => {
    const { variant_id, attributevariant_id } = req.body;

    const checkForeignKey = `
        SELECT
            (SELECT COUNT(*) FROM product_productvariant WHERE id = ?) as variant_exists,
            (SELECT COUNT(*) FROM product_attributevariant WHERE id = ?) as attributevariant_exists
    `;
    connection.query(checkForeignKey, [variant_id, attributevariant_id], (fkError, fkResults) => {
        if (fkError) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (!fkResults[0].variant_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: variant_id does not exist' });
            return;
        }

        if (!fkResults[0].attributevariant_exists) {
            res.status(400).json({ error: 'Foreign key constraint fails: attributevariant_id does not exist' });
            return;
        }

        const checkQuery = 'SELECT * FROM product_assignvariantattribute WHERE variant_id = ? AND attributevariant_id = ?';
        connection.query(checkQuery, [variant_id, attributevariant_id], (checkError, checkResults) => {
            if (checkError) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (checkResults.length > 0) {
                res.status(400).json({ error: 'Duplicate entry: The combination of variant_id and attributevariant_id already exists' });
                return;
            }

            const query = 'INSERT INTO product_assignvariantattribute (variant_id, attributevariant_id) VALUES (?, ?)';
            connection.query(query, [variant_id, attributevariant_id], (error, results) => {
                if (error) {
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                res.status(201).json({ message: 'Variant attribute assigned to variant successfully' });
            });
        });
    });
};

const addAssignedProductAttributeValue = (connection, req, res) => {
    const { assignproductattribute_id, attributevalue_id } = req.body;

    // Step 1: Retrieve attributeproduct_id from assignproductattribute_id and then get attribute_id
    const getAttributeProductQuery = `
        SELECT ap.attribute_id
        FROM product_assignproductattribute apa
        JOIN product_attributeproduct ap ON apa.attributeproduct_id = ap.id
        WHERE apa.id = ?
    `;
    
    connection.query(getAttributeProductQuery, [assignproductattribute_id], (attributeError, attributeResults) => {
        if (attributeError) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (attributeResults.length === 0) {
            res.status(400).json({ error: 'Invalid assignproductattribute_id' });
            return;
        }

        const attribute_id_from_assign = attributeResults[0].attribute_id;

        // Step 2: Validate attributevalue_id with attribute_id
        const checkAttributeValueQuery = `
            SELECT attribute_id
            FROM product_attributevalue
            WHERE id = ?
        `;
        
        connection.query(checkAttributeValueQuery, [attributevalue_id], (valueError, valueResults) => {
            if (valueError) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (valueResults.length === 0) {
                res.status(400).json({ error: 'Invalid attributevalue_id' });
                return;
            }

            const attribute_id_from_value = valueResults[0].attribute_id;

            if (attribute_id_from_assign !== attribute_id_from_value) {
                res.status(400).json({ error: 'attributevalue_id does not correspond to the correct attribute_id ' });
                return;
            }

            // Step 3: Check for duplicate entry
            const checkQuery = 'SELECT * FROM product_assignedproductattribute_value WHERE assignproductattribute_id = ? AND attributevalue_id = ?';
            connection.query(checkQuery, [assignproductattribute_id, attributevalue_id], (checkError, checkResults) => {
                if (checkError) {
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                if (checkResults.length > 0) {
                    res.status(400).json({ error: 'Duplicate entry: The combination of assignproductattribute_id and attributevalue_id already exists' });
                    return;
                }

                // Step 4: Insert into product_assignedproductattribute_value
                const query = 'INSERT INTO product_assignedproductattribute_value (assignproductattribute_id, attributevalue_id) VALUES (?, ?)';
                connection.query(query, [assignproductattribute_id, attributevalue_id], (insertError, insertResults) => {
                    if (insertError) {
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }

                    res.status(201).json({ message: 'Assigned product attribute value added successfully' });
                });
            });
        });
    });
};

const addAssignedVariantAttributeValue = (connection, req, res) => {
    const { assignvariantattribute_id, attributevalue_id } = req.body;

    // Step 1: Retrieve attributevariant_id and attribute_id from assignvariantattribute_id
    const getAttributeVariantQuery = `
        SELECT av.attributevariant_id, ap.attribute_id
        FROM product_assignvariantattribute av
        JOIN product_attributevariant ap ON av.attributevariant_id = ap.id
        WHERE av.id = ?
    `;
    
    connection.query(getAttributeVariantQuery, [assignvariantattribute_id], (variantError, variantResults) => {
        if (variantError) {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (variantResults.length === 0) {
            res.status(400).json({ error: 'Invalid assignvariantattribute_id' });
            return;
        }

        const attributevariant_id = variantResults[0].attributevariant_id;
        const attribute_id_from_variant = variantResults[0].attribute_id;

        // Step 2: Validate attributevalue_id with attribute_id
        const checkAttributeValueQuery = `
            SELECT attribute_id
            FROM product_attributevalue
            WHERE id = ?
        `;
        
        connection.query(checkAttributeValueQuery, [attributevalue_id], (valueError, valueResults) => {
            if (valueError) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (valueResults.length === 0) {
                res.status(400).json({ error: 'Invalid attributevalue_id' });
                return;
            }

            const attribute_id_from_value = valueResults[0].attribute_id;

            if (attribute_id_from_variant !== attribute_id_from_value) {
                res.status(400).json({ error: 'attributevalue_id does not correspond to the correct attribute_id' });
                return;
            }

            // Step 3: Check for duplicate entry
            const checkQuery = 'SELECT * FROM product_assignedvariantattribute_value WHERE assignvariantattribute_id = ? AND attributevalue_id = ?';
            connection.query(checkQuery, [assignvariantattribute_id, attributevalue_id], (checkError, checkResults) => {
                if (checkError) {
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                if (checkResults.length > 0) {
                    res.status(400).json({ error: 'Duplicate entry: The combination of assignvariantattribute_id and attributevalue_id already exists' });
                    return;
                }

                // Step 4: Insert into product_assignedvariantattribute_value
                const insertQuery = `
                    INSERT INTO product_assignedvariantattribute_value (assignvariantattribute_id, attributevalue_id)
                    VALUES (?, ?)
                `;
                connection.query(insertQuery, [assignvariantattribute_id, attributevalue_id], (insertError, insertResults) => {
                    if (insertError) {
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }

                    res.status(201).json({ message: 'Assigned variant attribute value added successfully' });
                });
            });
        });
    });
};
const getVariant = (connection) => async (req, res) => {
    const { product_id } = req.query;

    if (!product_id) {
        return res.status(400).json({ error: 'Missing required parameter: product_id' });
    }


    const variantQuery = `
        SELECT * 
        FROM product_productvariant
        WHERE product_id = ?
    `;

    const variantAttributesQuery = `
        SELECT pva.variant_id, pa.nameAtribbute, pav.nameValue
        FROM product_assignedvariantattribute_value pva_value
        JOIN product_assignvariantattribute pva ON pva_value.assignvariantattribute_id = pva.id
        JOIN product_attributevariant pavariant ON pva.attributevariant_id = pavariant.id
        JOIN product_attribute pa ON pavariant.attribute_id = pa.id
        JOIN product_attributevalue pav ON pva_value.attributevalue_id = pav.id
        WHERE pva.variant_id IN (SELECT id FROM product_productvariant WHERE product_id = ?)
    `;

    try {
        const variantResults = await query(variantQuery, [product_id]);
        const variantAttributesResults = await query(variantAttributesQuery, [product_id]);

        const variants = (variantResults || []).map(variant => {
            variant.attributes = (variantAttributesResults || []).filter(attr => attr.variant_id === variant.id);
            return variant;
        });

        res.status(200).json(variants);
    } catch (error) {
        console.error('Error retrieving variants and their attributes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getFullInfoProduct = (connection) => async (req, res) => {
    try {
        const productId = req.params.id;
        const productQuery = 'SELECT * FROM product WHERE Product_id = ?';
        const variantsQuery = 'SELECT * FROM product_productvariant WHERE product_id = ?';
        const productAttributesValueQuery = `
            SELECT pa.nameAtribbute, pav.nameValue 
            FROM product_assignedproductattribute_value ppa_value
            JOIN product_assignproductattribute paa ON ppa_value.assignproductattribute_id = paa.id
            JOIN product_attributeproduct pap ON paa.attributeproduct_id = pap.id
            JOIN product_attribute pa ON pap.attribute_id = pa.id
            JOIN product_attributevalue pav ON ppa_value.attributevalue_id = pav.id
            WHERE paa.product_id = ?
        `;
        const variantAttributesQuery = `
            SELECT pva.variant_id, pa.nameAtribbute, pav.nameValue
            FROM product_assignedvariantattribute_value pva_value
            JOIN product_assignvariantattribute pva ON pva_value.assignvariantattribute_id = pva.id
            JOIN product_attributevariant pavariant ON pva.attributevariant_id = pavariant.id
            JOIN product_attribute pa ON pavariant.attribute_id = pa.id
            JOIN product_attributevalue pav ON pva_value.attributevalue_id = pav.id
            WHERE pva.variant_id IN (SELECT id FROM product_productvariant WHERE product_id = ?)
        `;
        const productResults = await query(productQuery, [productId]);
        if (productResults.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = productResults[0];

        const variantResults = await query(variantsQuery, [productId]);
        product.variants = variantResults;

        const productAttributesValueResults = await query(productAttributesValueQuery, [productId]);
        product.attributesValue = productAttributesValueResults;

        if (variantResults.length > 0) {
            const variantIds = variantResults.map(variant => variant.id);
            const variantAttributesResults = await query(variantAttributesQuery, [productId]);
            product.variants.forEach(variant => {
                variant.attributes = variantAttributesResults.filter(attr => attr.variant_id === variant.id);
            });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error('Error fetching product info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getProduct = (connection) => (req, res) => {
    const { category, sort } = req.query;

    let query = `
        SELECT p.*, c.category_name 
        FROM product p
        JOIN Category c ON p.Category_id = c.category_id
        WHERE 1 = 1
    `;
    const queryParams = [];

    if (category) {
        query += ' AND c.category_name = ?';
        queryParams.push(category);
    }

    if (sort) {
        switch (sort) {
            case 'price_low_to_high':
                query += ' ORDER BY p.minimal_variant_price_amount ASC';
                break;
            case 'price_high_to_low':
                query += ' ORDER BY p.minimal_variant_price_amount DESC';
                break;
            case 'name':
                query += ' ORDER BY p.name ASC';
                break;
            case 'created':
                query += ' ORDER BY p.created_at DESC';
                break;
            default:
                query += ' ORDER BY p.created_at DESC';
        }
    } else {
        query += ' ORDER BY p.created_at DESC';
    }

    connection.query(query, queryParams, (error, results) => {
        if (error) {
            console.error('Error retrieving products:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(200).json(results);
    });
};

const addToWishlist = (connection) => async (req, res) => {
    const { Buyer_id, Product_id, created_at } = req.body;

    if (!Buyer_id || !Product_id || !created_at) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const query = `
        INSERT INTO wishlist (Buyer_id, Product_id, created_at)
        VALUES (?, ?, ?)
    `;

    const queryParams = [Buyer_id, Product_id, created_at];

    try {
        const [result] = await connection.query(query, queryParams);
        res.status(200).json({ message: 'Product added to wishlist successfully', wishlistId: result.insertId });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const updateProduct = (connection) => (req, res) => {
    const { product_id, name, title, description, weight, category, product_type_id, currency, minimal_variant_price_amount } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: 'Missing required field: product_id' });
    }

    const fieldsToUpdate = [];
    const valuesToUpdate = [];

    if (name) {
        fieldsToUpdate.push('name = ?');
        valuesToUpdate.push(name);
    }
    if (title) {
        fieldsToUpdate.push('title = ?');
        valuesToUpdate.push(title);
    }
    if (description) {
        fieldsToUpdate.push('description = ?');
        valuesToUpdate.push(description);
    }
    if (weight) {
        fieldsToUpdate.push('weight = ?');
        valuesToUpdate.push(weight);
    }
    if (category) {
        fieldsToUpdate.push('category = ?');
        valuesToUpdate.push(category);
    }
    if (product_type_id) {
        fieldsToUpdate.push('product_type_id = ?');
        valuesToUpdate.push(product_type_id);
    }
    if (currency) {
        fieldsToUpdate.push('currency = ?');
        valuesToUpdate.push(currency);
    }
    if (minimal_variant_price_amount) {
        fieldsToUpdate.push('minimal_variant_price_amount = ?');
        valuesToUpdate.push(minimal_variant_price_amount);
    }

    valuesToUpdate.push(product_id);

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    const updateQuery = `UPDATE product SET ${fieldsToUpdate.join(', ')} WHERE product_id = ?`;

    connection.query(updateQuery, valuesToUpdate, (err, results) => {
        if (err) {
            console.error('Error updating product:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(200).json({ message: 'Product updated successfully' });
    });
};
const addProductDailyDeal = (connection) => (req, res) => {
    const { Product_id, valid_until, daily_deal_id } = req.body;

    if (!Product_id || !valid_until || !daily_deal_id) {
        return res.status(400).json({ error: 'Missing required fields: Product_id, valid_until, daily_deal_id' });
    }

    const query = `
        INSERT INTO ProductDailyDeal (Product_id, valid_until, daily_deal_id)
        VALUES (?, ?, ?)
    `;

    connection.query(query, [Product_id, valid_until, daily_deal_id], (error, results) => {
        if (error) {
            console.error('Error adding product daily deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(201).json({ message: 'Product daily deal added successfully', dailyDealId: results.insertId });
    });
};
const addDailyDeal = (connection) => (req, res) => {
    const { deal_name, start_date, end_date, discount_percentage } = req.body;

    if (!deal_name || !start_date || !end_date || !discount_percentage) {
        return res.status(400).json({ error: 'Missing required fields: deal_name, start_date, end_date, discount_percentage' });
    }

    const query = `
        INSERT INTO Daily_Deal (deal_name, start_date, end_date, discount_percentage, created_at)
        VALUES (?, ?, ?, ?, NOW())
    `;

    connection.query(query, [deal_name, start_date, end_date, discount_percentage], (error, results) => {
        if (error) {
            console.error('Error adding daily deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(201).json({ message: 'Daily deal added successfully', dailyDealId: results.insertId });
    });
};
const deleteProduct = (connection) => async (req, res) => {
    const { product_id } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: 'Missing required field: product_id' });
    }

    try {
        const deleteDailyDealQuery = 'DELETE FROM productdailydeal WHERE Product_id = ?';
        await query( deleteDailyDealQuery, [product_id]);

        const deleteWarehouseStockQuery = `
            DELETE FROM warehousestock 
            WHERE product_variant_id IN (SELECT id FROM product_productvariant WHERE product_id = ?)
        `;
        await query(deleteWarehouseStockQuery, [product_id]);

        const deleteVariantQuery = 'DELETE FROM product_productvariant WHERE product_id = ?';
        await query( deleteVariantQuery, [product_id]);

        const deleteProductQuery = 'DELETE FROM product WHERE Product_id = ?';
        await query(deleteProductQuery, [product_id]);

        res.status(200).json({ message: 'Product and its variants deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error deleting product' });
    }
};

const addVoucher = (connection) => (req, res) => {
    const {
        voucher_code,
        discount_percentage,
        start_date,
        end_date,
        apply_once_per_order,
        created_at,
        updated_at,
        type,
        once_per_customer
    } = req.body;

    // Kiểm tra nếu các thông tin bắt buộc đều có trong request body
    
    if (!voucher_code) return res.status(400).json({ error: 'Missing required field: voucher_code' });
    if (discount_percentage == null) return res.status(400).json({ error: 'Missing required field: discount_percentage' });
    if (!start_date) return res.status(400).json({ error: 'Missing required field: start_date' });
    if (!end_date) return res.status(400).json({ error: 'Missing required field: end_date' });
    if (apply_once_per_order == null) return res.status(400).json({ error: 'Missing required field: apply_once_per_order' });
    if (!created_at) return res.status(400).json({ error: 'Missing required field: created_at' });
    if (!updated_at) return res.status(400).json({ error: 'Missing required field: updated_at' });
    if (!type) return res.status(400).json({ error: 'Missing required field: type' });
    if (once_per_customer == null) return res.status(400).json({ error: 'Missing required field: once_per_customer' });

    // Kiểm tra trùng voucher_code
    connection.query('SELECT * FROM discount_voucher WHERE voucher_code = ?', [voucher_code], (error, results) => {
        if (error) {
            console.error('Error checking for duplicate voucher code:', error);
            return res.status(500).json({ error: 'Internal server error checking voucher code' });
        }

        if (results.length > 0) {
            return res.status(409).json({ error: 'Voucher code already exists' });
        }

        // Thêm voucher vào database
        const query = `
            INSERT INTO discount_voucher 
            ( voucher_code, discount_percentage, start_date, end_date, apply_once_per_order, created_at, updated_at, type, once_per_customer) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        connection.query(
            query,
            [
                voucher_code,
                discount_percentage,
                start_date,
                end_date,
                apply_once_per_order,
                created_at,
                updated_at,
                type,
                once_per_customer
            ],
            (insertError, result) => {
                if (insertError) {
                    console.error('Error inserting voucher:', insertError);
                    return res.status(500).json({ error: 'Internal server error adding voucher' });
                }
                res.status(201).json({ message: 'Voucher added successfully', voucher: {  voucher_code, discount_percentage, start_date, end_date, apply_once_per_order, created_at, updated_at, type, once_per_customer } });
            }
        );
    });
};
 const getBuyerId = (userId) => {
    // console.log(userId);
        return new Promise((resolve, reject) => {
            const getBuyerIdQuery = 'SELECT Buyer_id FROM Buyer WHERE User_id = ?';
            connection.query(getBuyerIdQuery, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else if (results.length === 0) {
                    reject('Buyer not found for the user');
                } else {
                    resolve(results[0].buyer_id);
                }
            });
        });
    };

    const addReview = (connection) => async (req, res) => {
        const { Product_id, rating, review_text, created_at } = req.body;
        const userId = req.user.id;  
    
        if (!Product_id || !rating || !created_at || !review_text) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
    
        try {
            const Buyer_id = await getBuyerId(userId);
            console.log('buyer', Buyer_id)
            
    
            const productResult = await connection.query('SELECT Product_id FROM product WHERE Product_id = ?', [Product_id]);
    
            if (productResult.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
    
            const query = `
                INSERT INTO review (Product_id, Buyer_id, rating, review_text, created_at)
                VALUES (?, ?, ?, ?, ?)
            `;
    
            const queryParams = [Product_id, Buyer_id, rating, review_text, created_at];
    
            const result = await connection.query(query, queryParams);
            res.status(201).json({ message: 'Review added successfully', reviewId: result.insertId });
        } catch (error) {
            console.error('Error adding review:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    const addDiscountSale = (connection) => (req, res) => {
    const { name, value, start_date, end_date } = req.body;

    if (!name || !value || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields: name, value, start_date, or end_date' });
    }

    const query = `
        INSERT INTO discount_sale (name, value, start_date, end_date, created_at)
        VALUES (?, ?, ?, ?, NOW())
    `;

    connection.query(query, [name, value, start_date, end_date], (error, results) => {
        if (error) {
            console.error('Error adding discount sale:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ message: 'Discount sale added successfully', sale_id: results.insertId });
    });
};
const addProductToDiscountSale = (connection) => (req, res) => {
    const { sale_id, product_id } = req.body;

    if (!sale_id || !product_id) {
        return res.status(400).json({ error: 'Missing required fields: sale_id or product_id' });
    }

    const checkQuery = 'SELECT * FROM discount_sale_product WHERE sale_id = ? AND product_id = ?';
    connection.query(checkQuery, [sale_id, product_id], (checkError, checkResults) => {
        if (checkError) {
            console.error('Error checking for existing product discount sale:', checkError);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (checkResults.length > 0) {
            return res.status(409).json({ error: 'Product is already assigned to this discount sale' });
        }

        const query = `
            INSERT INTO discount_sale_product (sale_id, product_id)
            VALUES (?, ?)
        `;

        connection.query(query, [sale_id, product_id], (error, results) => {
            if (error) {
                console.error('Error adding product to discount sale:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'Product added to discount sale successfully', sale_product_id: results.insertId });
        });
    });
};

module.exports = {
    addProduct,
    addDiscountSale,addProductToDiscountSale,
    searchProduct,
    getAllProducts,
    addProductAttribute,
    addProductAttributeValue,
    addProductType,
    getProduct,
    returnProduct,
    addToWishlist,
    deleteProduct,
    addReview,
    updateProduct,addDailyDeal,
    addProductDailyDeal,
    addVoucher,

    // New endpoints
    addProductAttributeVariant,
    addProductAttributeProduct,
    assignProductAttributeToProduct,
    assignVariantAttributeToVariant,
    addAssignedProductAttributeValue,
    addAssignedVariantAttributeValue,
    //  getInfoProduct,
    getVariant,
    getFullInfoProduct,
    // filterProducts
};
