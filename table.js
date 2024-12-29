const addVoucher = (connection) => (req, res) => {
    const {
        voucher_code,discount_percentage,start_date,end_date,apply_once_per_order,created_at,updated_at,type,once_per_customer
    } = req.body;

   
    if (!voucher_code) return res.status(400).json({ error: 'Missing required field: voucher_code' });
    if (discount_percentage == null) return res.status(400).json({ error: 'Missing required field: discount_percentage' });
    if (!start_date) return res.status(400).json({ error: 'Missing required field: start_date' });
    if (!end_date) return res.status(400).json({ error: 'Missing required field: end_date' });
    connection.query('SELECT * FROM discount_voucher WHERE voucher_code = ?', [voucher_code], (error, results) => {
        if (error) {
            console.error('Error checking for duplicate voucher code:', error);
            return res.status(500).json({ error: 'Internal server error checking voucher code' });
        }

        if (results.length > 0) {
            return res.status(409).json({ error: 'Voucher code already exists' });
        }

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