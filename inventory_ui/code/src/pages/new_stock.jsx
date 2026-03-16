import React from "react";
import { Form, Card, Button, Alert, Container, Spinner, Row, Col, Table, Accordion, InputGroup, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useMutation, useQuery } from "react-query"
import APIBackend from '../RestAPI'
import dayjs from 'dayjs'
import { useNavigate } from "react-router-dom";

import { AddItemsPanel } from '../components/add_item_panel'
import { NewItemModal } from "./new_item_modal";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))


export function NewStockPage({ config }) {
    let navigate = useNavigate()
    let [reference, setReference] = React.useState("")
    let [location, setLocation] = React.useState(undefined)

    let [selected_items, setSelectedItems] = React.useState({})

    let [new_item_modal, setNewItemModal] = React.useState(false)

    let [validated, setValidated] = React.useState(false)
    let [errors, setErrors] = React.useState({})

    let [just_created, setJustCreated] = React.useState({ id: undefined, name: undefined })

    let url = get_url(config)
    const { isLoading: items_loading, error, data: all_items } = useQuery(
        ['all_items'],
        () =>
            fetch('http://' + url + '/list/items').then(res =>
                res.json()
            )
    )

    const { isLoading: locations_loading, data: locations } = useQuery(
        ['withdraw_location_list'],
        () =>
            fetch('http://' + url + '/list/locations').then(res =>
                res.json()
            )
    )

    React.useEffect(() => {
        if (locations && locations.length > 0 && location === undefined) {
            setLocation(locations[0].id)
        }
    }, [locations, location])

    const create_mutation = useMutation(
        async (data) => {
            let url = "http://" + get_url(config) + "/action/new-stock"
            console.log(url)
            return APIBackend.api_post(url, data).then((response) => {
                const get_json = async (response) => {
                    let output = await response.json()
                    return { status: response.status, payload: output }
                }
                return get_json(response)
            })
        },
        {
            onSuccess: (result) => {
                console.log(result)
                if (result.status !== 200) {
                    setValidated(true)
                    setErrors(result.payload)
                } else {
                    setValidated(false)
                    setErrors({})
                    setReference("")
                    setJustCreated(result.payload)
                }
            }
        }
    )


    let handleSubmit = (evt) => {
        evt.preventDefault();
        create_mutation.mutate({
            reference: reference,
            location: location,
            items: Object.keys(selected_items).map(key => ({ id: selected_items[key].id, quantity: selected_items[key].quantity }))
        })
    }



    if (items_loading || locations_loading)
        return <Container fluid="sm"><Alert variant="secondary">Loading<Spinner size="sm"></Spinner></Alert></Container>

    return <Container fluid="sm">
        <Card className="mt-3">
            <Card.Header>
                <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                    <h2>Add Stock</h2>
                    <Button
                        variant="outline-secondary"
                        className="bi bi-arrow-left"
                        onClick={() => navigate("/")}
                    >{" "}Back</Button>
                </div>
            </Card.Header>
            <Card.Body>
                <Form noValidate validated={validated} onSubmit={handleSubmit} className="mb-3">
                    <Form.Group className="mb-3">
                        <Form.Label>New Stock Reference</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="<Enter reference here> (e.g. order number)"
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            disabled={create_mutation.isPending}
                            isInvalid={'reference' in errors}
                            required
                        />
                        <Form.Control.Feedback type="invalid">{errors?.reference}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Inventory Location:</Form.Label>
                        <Form.Select value={location} onChange={event => setLocation(event.target.value)}>
                            {locations.map(entry => (
                                <option key={entry.id} value={entry.id}>{entry.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <AddItemsPanel
                        selected_items={selected_items}
                        setSelectedItems={setSelectedItems}
                        item_list={all_items}
                        available_title={<div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                            <span>Known Items</span>
                            <OverlayTrigger overlay={<Tooltip>Add a new Item</Tooltip>}>
                                <Button variant="outline-primary" size="sm" onClick={() => setNewItemModal(true)}>New</Button>
                            </OverlayTrigger>
                        </div>}
                        available_fields={[
                            { key: "name", label: "Item" },
                            { key: "$select$", label: "Add" }
                        ]}
                        selected_title="New Stock Items"
                        selected_fields={[
                            { key: "name", label: "Item" },
                            { key: "#quantity", label: "Quantity" },
                            { key: "$unselect$", label: "Remove" }
                        ]}
                        map_on_select={
                            [
                                {
                                    value: 0,
                                    to: "quantity"
                                }
                            ]
                        }
                    />
                    <div className="d-grid mt-2">
                        <Button type="submit" disabled={create_mutation.isPending}>Save</Button>
                    </div>
                </Form>

                {create_mutation.isError ? (
                    <Alert variant="danger">An error occurred: {create_mutation.error.message}</Alert>
                ) : null}

                {create_mutation.isSuccess ?
                    (just_created.added ?
                        <Alert variant="success" className="d-flex align-items-baseline justify-content-between">
                            <span>Stock added.</span>
                            <Button variant="success" onClick={() => navigate('/')}>Back to Overview</Button>
                        </Alert>
                        : <Alert variant="warning" className="d-flex align-items-baseline justify-content-between">Please fill out the required fields.</Alert>)
                    : null
                }
            </Card.Body>
        </Card>

        <NewItemModal
            show={new_item_modal}
            onHide={(new_item_id = undefined) => {
                setNewItemModal(false)
            }}
            config={config} />
    </Container>
}















