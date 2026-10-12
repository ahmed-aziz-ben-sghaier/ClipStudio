import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { findUserById, saveUser, getUsers } from "../db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = Router();


// Association priceId -> action
const PRICE_MAP = {
  [process.env.STRIPE_PRICE_PACK_10]: {
    type: "credits",
    amount: 10,
  },

  [process.env.STRIPE_PRICE_PACK_50]: {
    type: "credits",
    amount: 50,
  },

  [process.env.STRIPE_PRICE_SUB_PRO]: {
    type: "subscription",
    plan: "pro",
  },
};



// Créer une session Stripe Checkout
router.post(
  "/create-checkout-session",
  requireAuth,
  async (req, res) => {

    try {

      const { priceId } = req.body;


      const user = await findUserById(req.userId);


      if (!user) {
        return res
          .status(404)
          .json({ error: "Utilisateur introuvable" });
      }


      const config = PRICE_MAP[priceId];


      if (!config) {
        return res
          .status(400)
          .json({ error: "Offre inconnue" });
      }



      // Création du customer Stripe
      let customerId = user.stripeCustomerId;


      if (!customerId) {

        const customer =
          await stripe.customers.create({

            email: user.email,

            metadata: {
              userId: user.id,
            },

          });


        customerId = customer.id;


        user.stripeCustomerId = customerId;


        await saveUser(user);
      }




      const session =
        await stripe.checkout.sessions.create({

          customer: customerId,

          payment_method_types: [
            "card"
          ],


          mode:
            config.type === "subscription"
              ? "subscription"
              : "payment",


          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],


          success_url:
            `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,


          cancel_url:
            `${process.env.FRONTEND_URL}/cancel`,


          metadata: {
            userId: user.id,
            priceId,
          },

        });



      res.json({
        url: session.url,
      });



    } catch (err) {

      console.error(
        "Stripe checkout error:",
        err
      );


      res.status(500).json({
        error:
          "Erreur lors de la création du paiement",
      });

    }

  }
);





// Portail client Stripe
router.post(
  "/create-portal-session",
  requireAuth,
  async (req, res) => {


    try {


      const user =
        await findUserById(req.userId);



      if (!user?.stripeCustomerId) {

        return res
          .status(400)
          .json({
            error:
              "Aucun abonnement Stripe associé",
          });

      }



      const portal =
        await stripe.billingPortal.sessions.create({

          customer:
            user.stripeCustomerId,


          return_url:
            `${process.env.FRONTEND_URL}/dashboard`,

        });



      res.json({
        url: portal.url,
      });



    } catch(err){

      console.error(err);

      res.status(500).json({
        error:
          "Erreur portail Stripe",
      });

    }


  }
);







// Webhook Stripe
export async function stripeWebhookHandler(req, res) {


  const sig =
    req.headers["stripe-signature"];


  let event;



  try {


    event =
      stripe.webhooks.constructEvent(

        req.body,

        sig,

        process.env.STRIPE_WEBHOOK_SECRET

      );



  } catch(err){


    console.error(
      "Webhook signature invalide:",
      err.message
    );


    return res
      .status(400)
      .send(
        `Webhook Error: ${err.message}`
      );

  }





  if (
    event.type ===
    "checkout.session.completed"
  ) {


    const session =
      event.data.object;


    const userId =
      session.metadata?.userId;


    const priceId =
      session.metadata?.priceId;



    const user =
      await findUserById(userId);



    const config =
      PRICE_MAP[priceId];



    if(user && config){



      if(config.type === "credits"){


        user.credits =
          (user.credits || 0)
          + config.amount;


      }



      else if(
        config.type === "subscription"
      ){


        user.plan =
          config.plan;


        user.credits =
          (user.credits || 0)
          + 1000;

      }



      await saveUser(user);

    }


  }







  if(
    event.type ===
    "customer.subscription.deleted"
  ){


    const sub =
      event.data.object;



    const users =
      await getUsers();



    const user =
      users.find(
        (u)=>
          u.stripeCustomerId ===
          sub.customer
      );



    if(user){

      user.plan = "free";

      await saveUser(user);

    }


  }





  res.json({
    received:true,
  });


}





export default router;