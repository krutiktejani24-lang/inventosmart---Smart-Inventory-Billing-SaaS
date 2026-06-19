const { validationResult } = require("express-validator");
const service = require("../services/paymentService");

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(422).json({
      message: "Validation failed",
      errors: errors.array(),
    });

    return false;
  }

  return true;
};

/* ----------------------------------------
   POST /api/payments
---------------------------------------- */
const createPayment = async (req, res) => {

  try {

    const payment = await service.createPayment(

      req.user.businessId,

      req.body

    );

    res.status(201).json({

      success: true,

      data: payment,

    });

  } catch (err) {

    console.error(err);

    res.status(400).json({

      success: false,

      message: err.message,

    });

  }

};

const getPayments = async (req, res) => {

  try {

    const payments = await service.getPayments(

      req.user.businessId

    );

    res.json({

      success: true,

      data: payments,

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false,

      message: err.message,

    });

  }

};

const getSummary = async (req, res) => {

  try {

    const summary = await service.getSummary(

      req.user.businessId

    );

    res.json({

      success: true,

      data: summary,

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      success: false,

      message: err.message,

    });

  }

};

const deletePayment = async (req, res) => {

  try {

    await service.deletePayment(

      req.params.id,

      req.user.businessId

    );

    res.json({

      success: true,

      message: "Payment deleted",

    });

  } catch (err) {

    console.error(err);

    res.status(400).json({

      success: false,

      message: err.message,

    });

  }

};

module.exports = {

  createPayment,

  getPayments,

  getSummary,

  deletePayment,

};