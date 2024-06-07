# Generated by Django 3.2.16 on 2024-05-14 12:22

from django.db import migrations, models
import django.db.models.deletion
import state.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='EdgeType',
            fields=[
                ('key', models.CharField(max_length=20, primary_key=True, serialize=False)),
            ],
        ),
        migrations.CreateModel(
            name='NodeType',
            fields=[
                ('key', models.CharField(max_length=8, primary_key=True, serialize=False)),
            ],
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.CharField(max_length=24, primary_key=True, serialize=False)),
                ('type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='state.nodetype')),
            ],
            options={
                'verbose_name_plural': 'Nodes',
            },
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('event_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('quantity', models.IntegerField(blank=True, null=True)),
                ('timestamp', models.DateTimeField()),
                ('child', models.ForeignKey(on_delete=models.SET(state.models.removed_node), related_name='events_as_child', to='state.node')),
                ('from_parent', models.ForeignKey(blank=True, max_length=32, null=True, on_delete=models.SET(state.models.removed_node), related_name='departure_events', to='state.node')),
                ('to_parent', models.ForeignKey(max_length=32, on_delete=models.SET(state.models.removed_node), related_name='arrival_events', to='state.node')),
            ],
            options={
                'verbose_name_plural': 'Event Records',
            },
        ),
        migrations.CreateModel(
            name='Edge',
            fields=[
                ('edge_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('start', models.DateTimeField()),
                ('end', models.DateTimeField(blank=True, null=True)),
                ('quantity', models.IntegerField(blank=True, null=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links_to_parents', to='state.node')),
                ('edge_type', models.ForeignKey(blank=True, default=state.models.default_edge_type, on_delete=django.db.models.deletion.SET_DEFAULT, to='state.edgetype')),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links_to_children', to='state.node')),
            ],
            options={
                'verbose_name_plural': 'State Records',
            },
        ),
        migrations.AddIndex(
            model_name='edge',
            index=models.Index(fields=['parent', 'child', 'end'], name='parent_idx'),
        ),
        migrations.AddIndex(
            model_name='edge',
            index=models.Index(fields=['-start', '-end'], name='timestamp_idx'),
        ),
    ]
