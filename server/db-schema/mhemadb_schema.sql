--
-- PostgreSQL database dump
--

\restrict EGccKvsbolehlkPTMrxW9RZusbJL0ZBKl7SqFFgJm7pGIRzuDfMLRE5Sl5MfDyz

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AgentAvailability; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AgentAvailability" AS ENUM (
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE public."AgentAvailability" OWNER TO postgres;

--
-- Name: ChatType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ChatType" AS ENUM (
    'ORDER',
    'DIRECT',
    'SUPPORT'
);


ALTER TYPE public."ChatType" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'ORDER_ASSIGNED',
    'PAYMENT_CONFIRMED',
    'STATUS_UPDATE',
    'ADMIN_ALERT'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PLACED',
    'QUEUED',
    'ASSIGNED',
    'PICKED',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: PaymentProvider; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentProvider" AS ENUM (
    'M_PESA',
    'TIGO_PESA',
    'SELCOM',
    'RIPA'
);


ALTER TYPE public."PaymentProvider" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FAILED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'CUSTOMER',
    'AGENT',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agents (
    id text NOT NULL,
    user_id text NOT NULL,
    availability_status public."AgentAvailability" DEFAULT 'OFFLINE'::public."AgentAvailability" NOT NULL,
    current_order_count integer DEFAULT 0 NOT NULL,
    max_order_capacity integer DEFAULT 10 NOT NULL,
    commission_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    total_earnings numeric(10,2) DEFAULT 0.00 NOT NULL,
    rating numeric(3,2) DEFAULT 0.00 NOT NULL,
    total_deliveries integer DEFAULT 0 NOT NULL,
    last_online_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.agents OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id text NOT NULL,
    chat_id text NOT NULL,
    sender_id text NOT NULL,
    content text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_participants (
    id text NOT NULL,
    chat_id text NOT NULL,
    user_id text NOT NULL,
    unread_count integer DEFAULT 0 NOT NULL,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_read_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_participants OWNER TO postgres;

--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_rooms (
    id text NOT NULL,
    type public."ChatType" DEFAULT 'ORDER'::public."ChatType" NOT NULL,
    order_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.chat_rooms OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    related_order_id text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: order_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_queue (
    id text NOT NULL,
    order_id text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    queued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp(3) without time zone
);


ALTER TABLE public.order_queue OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id text NOT NULL,
    customer_id text NOT NULL,
    agent_id text,
    order_number text NOT NULL,
    status public."OrderStatus" DEFAULT 'PLACED'::public."OrderStatus" NOT NULL,
    pickup_address text NOT NULL,
    pickup_lat numeric(10,8),
    pickup_lng numeric(11,8),
    delivery_address text NOT NULL,
    delivery_lat numeric(10,8),
    delivery_lng numeric(11,8),
    transport_method_id text,
    description text,
    package_weight numeric(8,2),
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    payment_status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    payment_method text,
    payment_confirmed_at timestamp(3) without time zone,
    payment_confirmed_by text,
    placed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_at timestamp(3) without time zone,
    picked_at timestamp(3) without time zone,
    delivered_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    is_verified boolean DEFAULT false NOT NULL,
    product_image_urls text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payment_qr_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_qr_codes (
    id text NOT NULL,
    provider public."PaymentProvider" NOT NULL,
    account_name text NOT NULL,
    lipa_number text,
    qr_code_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    uploaded_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_qr_codes OWNER TO postgres;

--
-- Name: sales_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_records (
    id text NOT NULL,
    order_id text NOT NULL,
    agent_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    agent_commission numeric(10,2) NOT NULL,
    profit numeric(10,2) NOT NULL,
    recorded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sales_records OWNER TO postgres;

--
-- Name: transport_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transport_methods (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    base_price numeric(10,2) NOT NULL,
    price_per_km numeric(8,2),
    price_per_kg numeric(8,2),
    is_active boolean DEFAULT true NOT NULL,
    icon text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.transport_methods OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    phone text,
    role public."UserRole" DEFAULT 'CUSTOMER'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    avatar_url text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_queue order_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_qr_codes payment_qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_qr_codes
    ADD CONSTRAINT payment_qr_codes_pkey PRIMARY KEY (id);


--
-- Name: sales_records sales_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_pkey PRIMARY KEY (id);


--
-- Name: transport_methods transport_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_methods
    ADD CONSTRAINT transport_methods_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: agents_availability_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agents_availability_status_idx ON public.agents USING btree (availability_status);


--
-- Name: agents_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX agents_user_id_key ON public.agents USING btree (user_id);


--
-- Name: chat_messages_chat_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_messages_chat_id_created_at_idx ON public.chat_messages USING btree (chat_id, created_at);


--
-- Name: chat_participants_chat_id_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX chat_participants_chat_id_user_id_key ON public.chat_participants USING btree (chat_id, user_id);


--
-- Name: chat_rooms_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_rooms_order_id_idx ON public.chat_rooms USING btree (order_id);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);


--
-- Name: notifications_user_id_is_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_is_read_idx ON public.notifications USING btree (user_id, is_read);


--
-- Name: order_queue_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_queue_order_id_key ON public.order_queue USING btree (order_id);


--
-- Name: order_queue_priority_queued_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_queue_priority_queued_at_idx ON public.order_queue USING btree (priority, queued_at);


--
-- Name: order_queue_processed_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_queue_processed_at_idx ON public.order_queue USING btree (processed_at);


--
-- Name: orders_agent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_agent_id_idx ON public.orders USING btree (agent_id);


--
-- Name: orders_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_payment_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_payment_status_idx ON public.orders USING btree (payment_status);


--
-- Name: orders_placed_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_placed_at_idx ON public.orders USING btree (placed_at);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: payment_qr_codes_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_qr_codes_is_active_idx ON public.payment_qr_codes USING btree (is_active);


--
-- Name: payment_qr_codes_provider_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_qr_codes_provider_idx ON public.payment_qr_codes USING btree (provider);


--
-- Name: sales_records_agent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_records_agent_id_idx ON public.sales_records USING btree (agent_id);


--
-- Name: sales_records_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sales_records_order_id_key ON public.sales_records USING btree (order_id);


--
-- Name: sales_records_recorded_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sales_records_recorded_at_idx ON public.sales_records USING btree (recorded_at);


--
-- Name: transport_methods_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transport_methods_is_active_idx ON public.transport_methods USING btree (is_active);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_related_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_queue order_queue_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_payment_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_confirmed_by_fkey FOREIGN KEY (payment_confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_transport_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_transport_method_id_fkey FOREIGN KEY (transport_method_id) REFERENCES public.transport_methods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_qr_codes payment_qr_codes_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_qr_codes
    ADD CONSTRAINT payment_qr_codes_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_records sales_records_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_records sales_records_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict EGccKvsbolehlkPTMrxW9RZusbJL0ZBKl7SqFFgJm7pGIRzuDfMLRE5Sl5MfDyz

