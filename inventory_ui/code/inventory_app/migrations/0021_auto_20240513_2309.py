# Generated by Django 3.2.8 on 2024-05-13 23:09

import datetime
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory_app', '0020_alter_itemwithdrawal_location_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('homepage', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='SupplierItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('supplier_link', models.URLField(blank=True, null=True)),
                ('cost', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('expected_lead_time', models.DurationField(blank=True, null=True)),
                ('last_updated', models.DateField(auto_now=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='cost',
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='id',
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='location',
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='supplier',
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='supplier_link',
        ),
        migrations.RemoveField(
            model_name='inventoryitem',
            name='unit',
        ),
        migrations.RemoveField(
            model_name='orderitem',
            name='item',
        ),
        migrations.RemoveField(
            model_name='orderitem',
            name='location',
        ),
        migrations.RemoveField(
            model_name='orderitem',
            name='supplier',
        ),
        migrations.AlterField(
            model_name='inventoryitem',
            name='item',
            field=models.CharField(max_length=32, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='oracle_order_date',
            field=models.DateField(default=datetime.date.today),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='request_date',
            field=models.DateField(default=datetime.date.today),
        ),
        migrations.DeleteModel(
            name='ItemWithdrawal',
        ),
        migrations.DeleteModel(
            name='Location',
        ),
        migrations.AddField(
            model_name='supplieritem',
            name='item',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory_app.inventoryitem'),
        ),
        migrations.AddField(
            model_name='supplieritem',
            name='supplier',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory_app.supplier'),
        ),
        migrations.AddField(
            model_name='inventoryitem',
            name='suppliers',
            field=models.ManyToManyField(related_name='supplied_items', through='inventory_app.SupplierItem', to='inventory_app.Supplier'),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='supplier_item',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='current_orders', to='inventory_app.supplieritem'),
            preserve_default=False,
        ),
    ]
