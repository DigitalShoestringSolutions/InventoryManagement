import React from "react";
import { Container, Button, Col, Form, InputGroup, Row, Table, Spinner, Alert, Accordion, Card, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { groupBy } from "../table_utils";
import APIBackend from '../RestAPI'
import { AddItemsPanel } from '../components/add_item_panel'
import { useNavigate } from "react-router-dom";


import { NewItemModal } from "./new_item_modal";
import { SuppliedItemsModal } from "./supplied_items";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))



export function AdminPage({ config }) {
    let navigate = useNavigate()

    let [minimum_unit, setMinimumUnit] = React.useState("")
    let [quantity_per_unit, setQuantityPerUnit] = React.useState("")
    let [item, setItem] = React.useState("")

    let [selected_items, setSelectedItems] = React.useState({})

    let [validated, setValidated] = React.useState(false)
    let [errors, setErrors] = React.useState({})

    let [just_created, setJustCreated] = React.useState({ id: undefined, name: undefined })

    let [new_item_modal, setNewItemModal] = React.useState(false)
    let [supplied_item_modal, setSuppliedItemModal] = React.useState(false)

    let url = get_url(config)
    const { isLoading, error, data: items_list } = useQuery(
        ['list_items'],
        () =>
            fetch('http://' + url + '/list/items').then(res =>
                res.json()
            )
    )

    const { data: locations } = useQuery(
        ['location_list'],
        () =>
            fetch('http://' + url + '/list/locations').then(res =>
                res.json()
            )
    )

    const { isLoading: item_details_loading, error: item_details_err, data: item_details } = useQuery(
        ['get_item', item],
        () =>
            fetch('http://' + url + '/item/' + item).then(res =>
                res.json()
            ),
        {
            // The query will not execute until the item exists
            enabled: !!item,
            onSuccess: (data) => {
                setMinimumUnit(data.minimum_unit?? "")
                setQuantityPerUnit(data.quantity_per_unit ?? "")
                let default_selected = data.location_limits.reduce((acc, elem) => { acc[elem.id] = elem; return acc }, {})
                setSelectedItems(default_selected)
            }
        }
    )

    const save_mutation = useMutation(
        async (data) => {
            let url = "http://" + get_url(config) + "/item/"+data.id+"/"

            return APIBackend.api_put(url, data).then((response) => {
                const get_json = async (response) => {
                    let output = await response.json()
                    return { status: response.status, payload: output }
                }
                return get_json(response)
            })
        },
        {
            onSuccess: (result) => {
                if (result.status !== 200) {
                    setValidated(true)
                    setErrors(result.payload)
                } else {
                    setValidated(false)
                    setErrors({})
                    setMinimumUnit("")
                    setQuantityPerUnit("")
                    setItem("")
                    setJustCreated(result.payload)
                }
            }
        }
    )


    let handleSubmit = (evt) => {
        evt.preventDefault();
        let location_limits = Object.values(selected_items)
        save_mutation.mutate({
            id: item,
            quantity_per_unit: quantity_per_unit,
            minimum_unit: minimum_unit,
            location_limits: location_limits
        })
    }

    return <Container>
        <Card className="mt-3">
            <Card.Header>
                <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                    <h2>Manage Minimum Inventory Limits</h2>
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
                        <Form.Label>Item</Form.Label>
                        {items_list ?
                            <InputGroup>
                                <Form.Select value={item} onChange={event => setItem(event.target.value)} disabled={save_mutation.isPending}>
                                    <option hidden disabled value={""}>Select an Item</option>
                                    {items_list.map(entry => (
                                        <option key={entry.id} value={entry.id}>{entry.name}</option>
                                    ))}
                                </Form.Select>
                                <OverlayTrigger overlay={<Tooltip>Add a new Item</Tooltip>}>
                                    <Button variant="outline-primary" onClick={() => setNewItemModal(true)}>New</Button>
                                </OverlayTrigger>
                            </InputGroup>
                            : <Spinner size="sm" />}
                    </Form.Group>
                    {item ? <>
                        <Form.Group className="mb-3">
                            <Form.Label>Quantity Per Unit</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder='<How many of each product are considered a "unit">'
                                value={quantity_per_unit}
                                onChange={(event) => setQuantityPerUnit(event.target.value)}
                                disabled={save_mutation.isPending}
                                isInvalid={'quantity_per_unit' in errors}
                                required
                            />
                            <Form.Control.Feedback type="invalid">{errors?.quantity_per_unit}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Overall Minimum Units</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="<Number of units for reorder alert>"
                                value={minimum_unit}
                                onChange={(event) => setMinimumUnit(event.target.value)}
                                disabled={save_mutation.isPending}
                                isInvalid={'minimum_unit' in errors}
                                required
                            />
                            <Form.Control.Feedback type="invalid">{errors?.minimum_unit}</Form.Control.Feedback>
                        </Form.Group>
                    </>
                        : null}
                    <AddItemsPanel
                        selected_items={selected_items}
                        setSelectedItems={setSelectedItems}
                        item_list={!!item?locations:undefined}
                        available_title={"Locations"}
                        available_fields={[
                            { key: "name", label: "Location" },
                            { key: "$select$", label: "Add Limit" }
                        ]}
                        selected_title="Existing Limits"
                        selected_fields={[
                            { key: "name", label: "Location" },
                            { key: "#minimum_unit", label: "Minimum Unit" },
                            { key: "$unselect$", label: "Remove Limit" }
                        ]}
                        map_on_select={
                            [
                                {
                                    value: 0,
                                    to: "minimum_unit"
                                }
                            ]
                        }
                    />
                    <div className="d-grid mt-2">
                        <Button type="submit" disabled={save_mutation.isPending}>Save</Button>
                    </div>
                </Form>

                {save_mutation.isError ? (
                    <Alert variant="danger">An error occurred: {save_mutation.error.message}</Alert>
                ) : null}

                {save_mutation.isSuccess ?
                    (just_created.id ?
                        <Alert variant="success" className="d-flex align-items-baseline justify-content-between">
                            <span>Item Saved</span>
                            <span>(Item: {just_created.name}, Quantity Per Unit: {just_created.quantity_per_unit}, Minimum Units: {just_created.minimum_unit}, Location_limits:{just_created.location_limits.map(elem => <span>{elem.name}:{elem.minimum_unit},</span>)})</span>
                            <Button variant="success" onClick={() => navigate('/')}>Back to Inventory List</Button>
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
                if (new_item_id !== undefined)
                    setItem(new_item_id)
            }}
            config={config} />

        {/* <SuppliedItemsModal
            show={supplied_item_modal}
            onHide={() => setSuppliedItemModal(false)}
            config={config}
            supplier={supplier}
        /> */}
    </Container>
}