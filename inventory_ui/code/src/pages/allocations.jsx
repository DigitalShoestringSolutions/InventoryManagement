import React from "react";
import { Form, Card, Button, Alert, Container, Spinner, Row, Col, Table, Accordion, InputGroup, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useMutation, useQuery, useQueryClient } from "react-query"
import APIBackend from '../RestAPI'
import dayjs from 'dayjs'
import { useNavigate } from "react-router-dom";

import { AddItemsPanel } from '../components/add_item_panel'
import { NewSupplierModal } from "./new_supplier";
import { SuppliedItemsModal } from "./supplied_items";

import CreatableSelect from 'react-select/creatable';

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))


export function AllocationPage({ config }) {
    let navigate = useNavigate()
    let [new_allocation, setNewAllocation] = React.useState(undefined)
    let [allocation_reference, setAllocationReference] = React.useState("")

    let [date_expected_completion, setDateExpectedCompletion] = React.useState(dayjs())

    let [selected_items, setSelectedItems] = React.useState({})

    let [validated, setValidated] = React.useState(false)
    let [errors, setErrors] = React.useState({})

    let [just_created, setJustCreated] = React.useState({ id: undefined, name: undefined })

    //get allocation_ref from url params
    React.useEffect(() => {
        let params = new URLSearchParams(window.location.search)
        let allocation_ref = params.get("allocation")
        if (allocation_ref) {
            setAllocationReference({ value: allocation_ref, label: allocation_ref })
        }
    }, [])

    let queryClient = useQueryClient()

    let url = get_url(config)
    const { isLoading, error, data: all_items } = useQuery(
        ['all_items'],
        () =>
            fetch('http://' + url + '/list/items').then(res =>
                res.json()
            )
    )

    const { isLoading: allocations_loading, data: allocations_dataset } = useQuery(
        ['allocation_dataset'],
        () =>
            fetch('http://' + url + '/list/allocations').then(res =>
                res.json()
            )
    )


    React.useEffect(() => {
        let ref = allocation_reference?.value
        let allocation_data = (allocations_dataset ?? []).find(allocation => allocation.reference === ref)

        if (allocation_data) {
            setDateExpectedCompletion(dayjs(allocation_data.date_expected_completion))
            let new_selected_items = {}
            allocation_data.allocated_items.forEach(item => {
                new_selected_items[item.item_id] = { ...item, id: item.item_id, name: item.item_name, quantity: item.allocated_quantity }
            })
            setSelectedItems(new_selected_items)
        } else {
            // New allocation
            setDateExpectedCompletion(dayjs())
            setSelectedItems({})
        }
    }, [allocation_reference, allocations_dataset])

    const create_mutation = useMutation(
        async (data) => {
            let url = "http://" + get_url(config) + "/action/allocation"

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
                if (result.status !== 201) {
                    setValidated(true)
                    setErrors(result.payload.errors ?? {})
                } else {
                    setValidated(false)
                    setErrors({})
                    setAllocationReference("")
                    setDateExpectedCompletion(dayjs())
                    setJustCreated(result.payload.created_allocations)
                    setNewAllocation(undefined)
                }

                queryClient.invalidateQueries(['allocation_dataset'])
            }
        }
    )

    const delete_mutation = useMutation(
        async (allocation_reference) => {
            let url = "http://" + get_url(config) + "/action/delete-allocation"

            return APIBackend.api_post(url, { allocation_reference: allocation_reference }).then((response) => {
                const get_json = async (response) => {
                    let output = await response.json()
                    return { status: response.status, payload: output }
                }
                return get_json(response)
            })
        },
        {
            onSuccess: (result) => {
                if (result.status === 200) {
                    setValidated(false)
                    setErrors({})
                    setAllocationReference("")
                    setDateExpectedCompletion(dayjs())
                    setJustCreated(result.payload.created_allocations)
                    queryClient.invalidateQueries(['allocation_dataset'])
                    navigate('/allocate')
                } else {
                    setValidated(true)
                    setErrors(result.payload.errors ?? {})
                }
            }
        }
    )

    const handleCreate = (inputValue) => {
        setNewAllocation(inputValue);
        setAllocationReference({ value: inputValue, label: "new: " + inputValue });
    };

    const handleAllocationChange = (newValue) => {
        setAllocationReference(newValue)
    }

    let handleSubmit = (evt) => {
        evt.preventDefault();
        create_mutation.mutate({
            allocation_reference: allocation_reference?.value,
            date_expected_completion: date_expected_completion.format("YYYY-MM-DD"),
            items: Object.keys(selected_items).map(key => ({ item: selected_items[key].id, quantity_requested: selected_items[key].quantity }))
        })
    }

    if (isLoading || allocations_loading)
        return <Container fluid="sm"><Alert variant="secondary">Loading<Spinner size="sm"></Spinner></Alert></Container>

    let allocation_options = (allocations_dataset ?? []).map((allocation) => ({ value: allocation.reference, label: allocation.reference }))

    if (new_allocation)
        allocation_options.unshift({ value: new_allocation, label: "new: " + new_allocation })

    return <Container fluid="sm">
        <Card className="mt-3">
            <Card.Header>
                <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                    <h2>Allocations</h2>
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
                        <Form.Label>Allocation Reference</Form.Label>
                        <InputGroup>
                            {/* <Form.Control
                                type="text"
                                placeholder="<Enter allocation reference here> (e.g. order number or project code)"
                                value={allocation_reference}
                                onChange={(event) => setAllocationReference(event.target.value)}
                                disabled={create_mutation.isPending}
                                isInvalid={'allocation_reference' in errors}
                                required
                            /> */}
                            <CreatableSelect
                                className="w-100"
                                placeholder="Choose an existing allocation to edit or type here to create a new one..."
                                isClearable
                                isDisabled={allocations_loading}
                                isLoading={allocations_loading}
                                onChange={(newValue) => handleAllocationChange(newValue)}
                                onCreateOption={handleCreate}
                                options={allocation_options}
                                value={allocation_reference}
                            />
                            <Form.Control.Feedback type="invalid">{errors?.allocation_reference}</Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Expected Completion</Form.Label>
                        <Form.Control type="date" placeholder="" value={date_expected_completion.format("YYYY-MM-DD")} onChange={(event) => setDateExpectedCompletion(dayjs(event.target.value))} disabled={create_mutation.isPending} />
                    </Form.Group>
                    <AddItemsPanel
                        selected_items={selected_items}
                        setSelectedItems={setSelectedItems}
                        item_list={all_items}
                        available_title={<div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                            <span>Inventory Items</span>
                        </div>}
                        available_fields={[
                            { key: "name", label: "Item" },
                            { key: "$select$", label: "Add to Allocation" }
                        ]}
                        selected_title="Allocated Items"
                        selected_fields={[
                            { key: "name", label: "Item" },
                            { key: "fulfilled", label: "Fulfilled" },
                            { key: "#quantity", label: "Quantity" },
                            { key: "$unselect$", label: "Remove from Allocation" }
                        ]}
                        map_on_select={
                            [
                                {
                                    value: 0,
                                    to: "quantity"
                                },
                                {
                                    value: 0,
                                    to: "fulfilled"
                                }
                            ]
                        }
                    />
                    <div className="d-flex mt-2">
                        {(allocations_dataset ?? []).find(allocation => allocation.reference === allocation_reference?.value) && <Button className="w-100" type="button" variant="danger" onClick={() => delete_mutation.mutate(allocation_reference?.value)}>Delete</Button>}
                        <Button className="w-100 ms-2" type="submit" disabled={create_mutation.isPending}>{new_allocation !== undefined && allocation_reference?.value === new_allocation ? "Create" : "Save"}</Button>
                    </div>
                </Form>

                {create_mutation.isError ? (
                    <Alert variant="danger">An error occurred: {create_mutation.error.message}</Alert>
                ) : null}

                {create_mutation.isSuccess ?
                    (just_created.length > 0 ?
                        <Alert variant="success" className="d-flex align-items-baseline justify-content-between">
                            <span>Allocation created.</span>
                            <Button variant="success" onClick={() => navigate('/')}>Back to Order List</Button>
                        </Alert>
                        : <Alert variant="warning" className="d-flex align-items-baseline justify-content-between">Please fill out the required fields.</Alert>)
                    : null
                }
            </Card.Body>
        </Card>
    </Container>
}















